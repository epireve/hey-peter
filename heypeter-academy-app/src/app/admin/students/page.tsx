import { studentService } from "@/lib/services/student-service";
import { columns } from "./columns";
import { StudentsPageClient } from "@/components/admin/students/StudentsPageClient";

export default async function StudentsPage() {
  const { data: students, error } = await studentService.getAll({
    orderBy: { column: "created_at", ascending: false },
  });

  if (error) {
    return <div className="p-4 text-red-500">Error: {error.message || "Failed to load students"}</div>;
  }

  return <StudentsPageClient initialStudents={students || []} columns={columns} />;
}