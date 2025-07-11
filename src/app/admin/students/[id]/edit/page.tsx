import { notFound } from "next/navigation";
import { studentService } from "@/lib/services/student-service";
import { StudentForm } from "@/components/admin/students/StudentForm";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function StudentEditPage({ params }: PageProps) {
  const { id } = await params;
  const result = await studentService.getStudent(id);
  
  if (result.error || !result.data) {
    notFound();
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Student</h1>
        <p className="text-muted-foreground">
          Update student information and settings
        </p>
      </div>
      
      <StudentForm student={result.data} mode="edit" />
    </div>
  );
}