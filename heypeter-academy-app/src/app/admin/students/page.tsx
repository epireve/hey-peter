import { studentService } from "@/lib/services/student-service";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "./columns";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function StudentsPage() {
  const { data: students, error } = await studentService.getAll({
    orderBy: { column: "created_at", ascending: false },
  });

  if (error) {
    return <div className="p-4 text-red-500">Error: {error.message || "Failed to load students"}</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Students</h1>
        <Link href="/admin/students/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Student
          </Button>
        </Link>
      </div>
      <DataTable columns={columns} data={students || []} />
    </div>
  );
}