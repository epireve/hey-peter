import { StudentForm } from "@/components/admin/students/StudentForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewStudentPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <Link href="/admin/students">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Students
          </Button>
        </Link>
      </div>
      <div className="max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Add New Student</h1>
        <StudentForm mode="create" />
      </div>
    </div>
  );
}