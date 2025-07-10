'use client';

import { useState, useEffect } from 'react';
import { StudentInformationManager } from './StudentInformationManager';
// import { studentManagementService } from '@/lib/services/student-management-service';
import type { StudentInfo, CreateStudentData, UpdateStudentData } from '@/types/student-management';
import { useToast } from '@/components/ui/use-toast';

export function StudentInformationManagerClient() {
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Load initial data
  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setIsLoading(true);
    try {
      // Mock data for now - will be replaced with real database integration
      const mockData: StudentInfo[] = [
        {
          id: '1',
          student_id: 'HPA001',
          internal_code: 'SC001-001',
          full_name: 'Ahmad Rahman',
          email: 'ahmad.rahman@email.com',
          test_level: 'Business English',
          status: 'Active',
          progress_percentage: 75,
          payment_status: 'Paid',
          coach: 'Sarah Johnson',
          total_amount_paid: 3600,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          phone: '+60123456789',
          attendance_rate: 92,
          hour_balance: 25,
          hours_used: 35,
          total_hours_purchased: 60,
        },
        {
          id: '2',
          student_id: 'HPA002',
          internal_code: 'SC002-001',
          full_name: 'Lim Wei Ming',
          email: 'lim.weiming@email.com',
          test_level: 'Speak Up',
          status: 'Active',
          progress_percentage: 45,
          payment_status: 'Installment',
          coach: 'David Chen',
          total_amount_paid: 1200,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          phone: '+60123456790',
          attendance_rate: 88,
          hour_balance: 22,
          hours_used: 18,
          total_hours_purchased: 40,
        },
      ];

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStudents(mockData);
    } catch (error) {
      console.error('Failed to load students:', error);
      toast({
        title: 'Error loading students',
        description: 'An unexpected error occurred while loading students.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateStudent = async (studentData: Partial<StudentInfo>) => {
    try {
      // Mock implementation - will be replaced with real database integration
      console.log('Creating student:', studentData);
      
      toast({
        title: 'Student created successfully',
        description: `${studentData.full_name} has been added to the system.`,
      });

      // Reload students to get the latest data
      await loadStudents();
      return true;
    } catch (error) {
      console.error('Failed to create student:', error);
      toast({
        title: 'Error creating student',
        description: 'An unexpected error occurred while creating the student.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleUpdateStudent = async (studentId: string, studentData: Partial<StudentInfo>) => {
    try {
      // Mock implementation - will be replaced with real database integration
      console.log('Updating student:', studentId, studentData);
      
      toast({
        title: 'Student updated successfully',
        description: `${studentData.full_name}'s information has been updated.`,
      });

      // Reload students to get the latest data
      await loadStudents();
      return true;
    } catch (error) {
      console.error('Failed to update student:', error);
      toast({
        title: 'Error updating student',
        description: 'An unexpected error occurred while updating the student.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    try {
      // Mock implementation - will be replaced with real database integration
      console.log('Deleting student:', studentId);
      
      toast({
        title: 'Student deleted successfully',
        description: 'The student has been removed from the system.',
      });

      // Reload students to get the latest data
      await loadStudents();
      return true;
    } catch (error) {
      console.error('Failed to delete student:', error);
      toast({
        title: 'Error deleting student',
        description: 'An unexpected error occurred while deleting the student.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleExportStudents = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      // Mock implementation - will be replaced with real database integration
      console.log('Exporting students in format:', format);
      
      // Create mock CSV data
      const csvContent = [
        'Student ID,Full Name,Email,Course Type,Status,Progress,Payment Status',
        'HPA001,Ahmad Rahman,ahmad.rahman@email.com,Business English,Active,75%,Paid',
        'HPA002,Lim Wei Ming,lim.weiming@email.com,Speak Up,Active,45%,Installment'
      ].join('\n');
      
      if (format === 'csv') {
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `students_export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      }

      toast({
        title: 'Export successful',
        description: `Students data exported in ${format.toUpperCase()} format.`,
      });
    } catch (error) {
      console.error('Failed to export students:', error);
      toast({
        title: 'Error exporting students',
        description: 'An unexpected error occurred while exporting students.',
        variant: 'destructive',
      });
    }
  };

  const handleImportStudents = async (file: File) => {
    try {
      // Mock implementation - will be replaced with real database integration
      console.log('Importing students from file:', file.name);
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: 'Import completed',
        description: `Successfully imported 2 students from ${file.name}.`,
      });

      // Reload students to get the latest data
      await loadStudents();
      return true;
    } catch (error) {
      console.error('Failed to import students:', error);
      toast({
        title: 'Error importing students',
        description: 'An unexpected error occurred while importing students.',
        variant: 'destructive',
      });
      return false;
    }
  };

  return (
    <StudentInformationManager
      isLoading={isLoading}
      students={students}
      onCreateStudent={handleCreateStudent}
      onUpdateStudent={handleUpdateStudent}
      onDeleteStudent={handleDeleteStudent}
      onExportStudents={handleExportStudents}
      onImportStudents={handleImportStudents}
    />
  );
}