import { createServerStudentService } from "@/lib/services/student-service-server";
import { columns } from "./columns";
import { LazyStudentsPageClient } from "@/components/admin/LazyAdminComponents";

export default async function StudentsPage() {
  const studentService = createServerStudentService();
  const { data: students, error } = await studentService.getAll({
    orderBy: { column: "created_at", ascending: false },
  });

  if (error) {
    return <div className="p-4 text-red-500">Error: {error.message || "Failed to load students"}</div>;
  }

  return <LazyStudentsPageClient initialStudents={students || []} columns={columns} />;
}