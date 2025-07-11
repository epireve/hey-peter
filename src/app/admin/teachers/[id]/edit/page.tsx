import { notFound } from "next/navigation";
import { getTeacher } from "@/lib/actions/teacher";
import { TeacherEditForm } from "@/components/admin/teachers/TeacherEditForm";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function TeacherEditPage({ params }: PageProps) {
  const { id } = await params;
  const result = await getTeacher(id);
  
  if (result.error || !result.data) {
    notFound();
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Teacher</h1>
        <p className="text-muted-foreground">
          Update teacher information and settings
        </p>
      </div>
      
      <TeacherEditForm teacher={result.data} />
    </div>
  );
}