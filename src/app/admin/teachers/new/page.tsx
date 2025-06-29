import { TeacherFormEnhanced } from "@/components/admin/teachers/TeacherFormEnhanced";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewTeacherPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <Link href="/admin/teachers">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Teachers
          </Button>
        </Link>
      </div>
      <TeacherFormEnhanced />
    </div>
  );
}