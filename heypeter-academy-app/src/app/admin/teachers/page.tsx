import { getTeachers } from "@/lib/actions/teacher";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "./columns";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function TeachersPage() {
  const { data: teachers, error } = await getTeachers();

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Teachers</h1>
        <Link href="/admin/teachers/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Teacher
          </Button>
        </Link>
      </div>
      <DataTable columns={columns} data={teachers || []} />
    </div>
  );
}