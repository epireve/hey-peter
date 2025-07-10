'use client';

import React, { useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, Upload, Download } from 'lucide-react';
import { ImportExportDialog } from '../ImportExportDialog';
import { studentService } from '@/lib/services/student-service';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';

interface StudentsPageClientProps {
  initialStudents: any[];
  columns: any[];
}

export function StudentsPageClient({ initialStudents, columns }: StudentsPageClientProps) {
  const [students, setStudents] = useState(initialStudents);
  const [importExportOpen, setImportExportOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

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

  const handleImport = async (data: any[]) => {
    try {
      // Process each student
      for (const studentData of data) {
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
      }

      toast({
        title: 'Import successful',
        description: `Imported ${data.length} students successfully`,
      });

      // Refresh the page to show new data
      router.refresh();
    } catch (error) {
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Failed to import students',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleExport = async () => {
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
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Students</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportExportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import/Export
          </Button>
          <Link href="/admin/students/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Student
            </Button>
          </Link>
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={students} 
        filterColumn="email"
        filterPlaceholder="Filter by email..." 
      />

      <ImportExportDialog
        open={importExportOpen}
        onOpenChange={setImportExportOpen}
        entityType="students"
        onImport={handleImport}
        onExport={handleExport}
        columns={importColumns}
      />
    </div>
  );
}