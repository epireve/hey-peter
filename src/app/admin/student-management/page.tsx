'use client';

import { logger } from '@/lib/services';

import { StudentInformationManager } from "@/components/admin/StudentInformationManager";

export default function StudentManagementPage() {
  const handleCreateStudent = async (studentData: any) => {
    logger.info('Creating student:', studentData);
    return true;
  };

  const handleUpdateStudent = async (studentId: string, studentData: any) => {
    logger.info('Updating student:', studentId, studentData);
    return true;
  };

  const handleDeleteStudent = async (studentId: string) => {
    logger.info('Deleting student:', studentId);
    return true;
  };

  const handleExportStudents = (format: 'csv' | 'excel' | 'pdf') => {
    logger.info('Exporting students in format:', format);
  };

  const handleImportStudents = async (file: File) => {
    logger.info('Importing students from file:', file.name);
    return true;
  };

  return (
    <div className="container mx-auto py-6">
      <StudentInformationManager
        isLoading={false}
        onCreateStudent={handleCreateStudent}
        onUpdateStudent={handleUpdateStudent}
        onDeleteStudent={handleDeleteStudent}
        onExportStudents={handleExportStudents}
        onImportStudents={handleImportStudents}
      />
    </div>
  );
}