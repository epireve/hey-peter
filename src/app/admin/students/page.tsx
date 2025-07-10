import { createServerStudentService } from "@/lib/services/student-service-server";
import { columns } from "./columns";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Lazy load the StudentsPageClient component
const StudentsPageClient = dynamic(
  () => import("@/components/admin/students/StudentsPageClient").then(mod => ({ default: mod.StudentsPageClient })),
  {
    loading: () => (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    ),
  }
);

export default async function StudentsPage() {
  const studentService = createServerStudentService();
  const { data: students, error } = await studentService.getAll({
    orderBy: { column: "created_at", ascending: false },
  });

  if (error) {
    return <div className="p-4 text-red-500">Error: {error.message || "Failed to load students"}</div>;
  }

  return <StudentsPageClient initialStudents={students || []} columns={columns} />;
}