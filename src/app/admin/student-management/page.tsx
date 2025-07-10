'use client';

import { StudentInformationManager } from "@/components/admin/StudentInformationManager";

export default function StudentManagementPage() {
  const handleCreateStudent = async (studentData: any) => {
    console.log('Creating student:', studentData);
    return true;
  };

  const handleUpdateStudent = async (studentId: string, studentData: any) => {
    console.log('Updating student:', studentId, studentData);
    return true;
  };

  const handleDeleteStudent = async (studentId: string) => {
    console.log('Deleting student:', studentId);
    return true;
  };

  const handleExportStudents = (format: 'csv' | 'excel' | 'pdf') => {
    console.log('Exporting students in format:', format);
  };

  const handleImportStudents = async (file: File) => {
    console.log('Importing students from file:', file.name);
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