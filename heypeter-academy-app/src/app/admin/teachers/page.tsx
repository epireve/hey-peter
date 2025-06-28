import { getTeachers } from "@/lib/actions/teacher";
import { columns } from "./columns";
import { TeachersPageClient } from "@/components/admin/teachers/TeachersPageClient";

export default async function TeachersPage() {
  const { data: teachers, error } = await getTeachers();

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  return <TeachersPageClient initialTeachers={teachers || []} columns={columns} />;
}