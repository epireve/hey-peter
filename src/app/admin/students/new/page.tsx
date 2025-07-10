import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

// Lazy load the StudentForm component
const StudentForm = dynamic(
  () => import("@/components/admin/students/StudentForm").then(mod => ({ default: mod.StudentForm })),
  {
    loading: () => (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    ),
  }
);

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