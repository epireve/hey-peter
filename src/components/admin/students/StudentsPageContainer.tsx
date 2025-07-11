'use client';

import { logger } from '@/lib/services';

import React, { useState, useCallback, useEffect } from 'react';
import { StudentsPagePresentation } from './StudentsPagePresentation';
import { studentService } from '@/lib/services/student-service';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import type { Student, StudentFormData } from '@/types/student';

interface StudentsPageContainerProps {
  initialStudents?: Student[];
}

/**
 * Container component for Students Page
 * Handles all business logic, data fetching, and state management
 */
export const StudentsPageContainer: React.FC<StudentsPageContainerProps> = ({ 
  initialStudents = [] 
}) => {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [loading, setLoading] = useState(false);
  const [importExportOpen, setImportExportOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Define import columns configuration
  const importColumns = [
    { key: 'email', header: 'Email', required: true },
    { key: 'full_name', header: 'Full Name', required: true },
    { key: 'phone_number', header: 'Phone Number' },
    { key: 'date_of_birth', header: 'Date of Birth', transform: (value: any) => value ? new Date(value).toISOString() : null },
    { key: 'gender', header: 'Gender' },
    { key: 'address', header: 'Address' },
    { key: 'emergency_contact_name', header: 'Emergency Contact Name' },
    { key: 'emergency_contact_phone', header: 'Emergency Contact Phone' },
    { key: 'notes', header: 'Notes' },
  ];

  // Load students if not provided as initial data
  useEffect(() => {
    if (initialStudents.length === 0) {
      loadStudents();
    }
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const { data, error } = await studentService.getAll({
        orderBy: { column: 'created_at', ascending: false },
      });

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load students',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = useCallback(async (data: any[]) => {
    try {
      setLoading(true);
      let successCount = 0;
      const errors: string[] = [];

      // Process each student
      for (const [index, studentData] of data.entries()) {
        try {
          await studentService.create({
            ...studentData,
            profile_data: {
              phone_number: studentData.phone_number,
              date_of_birth: studentData.date_of_birth,
              gender: studentData.gender,
              address: studentData.address,
              emergency_contact: {
                name: studentData.emergency_contact_name,
                phone: studentData.emergency_contact_phone,
              },
            },
          });
          successCount++;
        } catch (error) {
          errors.push(`Row ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (successCount > 0) {
        toast({
          title: 'Import successful',
          description: `Imported ${successCount} students successfully${errors.length > 0 ? ` (${errors.length} failed)` : ''}`,
        });

        // Refresh the data
        await loadStudents();
      }

      if (errors.length > 0) {
        logger.error('Import errors:', errors);
      }
    } catch (error) {
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Failed to import students',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleExport = useCallback(async () => {
    try {
      const { data, error } = await studentService.getAll({
        orderBy: { column: 'created_at', ascending: false },
      });

      if (error) throw error;

      // Transform data for export
      return (data || []).map(student => ({
        email: student.email,
        full_name: student.full_name,
        phone_number: student.profile_data?.phone_number || '',
        date_of_birth: student.profile_data?.date_of_birth || '',
        gender: student.profile_data?.gender || '',
        address: student.profile_data?.address || '',
        emergency_contact_name: student.profile_data?.emergency_contact?.name || '',
        emergency_contact_phone: student.profile_data?.emergency_contact?.phone || '',
        notes: student.profile_data?.notes || '',
        created_at: student.created_at,
      }));
    } catch (error) {
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Failed to export students',
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast]);

  const handleDeleteStudent = useCallback(async (studentId: string) => {
    try {
      await studentService.delete(studentId);
      
      toast({
        title: 'Success',
        description: 'Student deleted successfully',
      });

      // Update local state
      setStudents(prev => prev.filter(s => s.id !== studentId));
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete student',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const handleEditStudent = useCallback((studentId: string) => {
    router.push(`/admin/students/${studentId}/edit`);
  }, [router]);

  const handleAddStudent = useCallback(() => {
    router.push('/admin/students/new');
  }, [router]);

  const handleRefresh = useCallback(() => {
    loadStudents();
  }, []);

  return (
    <StudentsPagePresentation
      students={students}
      loading={loading}
      importExportOpen={importExportOpen}
      importColumns={importColumns}
      onImportExportOpenChange={setImportExportOpen}
      onImport={handleImport}
      onExport={handleExport}
      onAddStudent={handleAddStudent}
      onEditStudent={handleEditStudent}
      onDeleteStudent={handleDeleteStudent}
      onRefresh={handleRefresh}
    />
  );
};

StudentsPageContainer.displayName = 'StudentsPageContainer';