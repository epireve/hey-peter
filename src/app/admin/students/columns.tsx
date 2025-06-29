"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { studentService } from "@/lib/services/student-service";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useConfirmationDialog } from "@/components/ui/confirmation-dialog";

export type Student = {
  id: string;
  internal_code: string;
  test_level?: string;
  course_type?: string;
  hours_tutored: number;
  hours_remaining: number;
  created_at: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
  };
};

function ActionsCell({ student }: { student: Student }) {
  const router = useRouter();
  const { confirm, dialog } = useConfirmationDialog();

  const handleDelete = () => {
    confirm({
      title: "Delete Student",
      description: `Are you sure you want to delete ${student.user.full_name}? This action cannot be undone.`,
      confirmLabel: "Delete",
      variant: "destructive",
      onConfirm: async () => {
        const result = await studentService.delete(student.id);
        if (result.error) {
          toast.error(result.error.message || "Failed to delete student");
        } else {
          toast.success("Student deleted successfully");
          router.refresh();
        }
      },
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => navigator.clipboard.writeText(student.user.email)}
          >
            Copy email
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => router.push(`/admin/students/${student.id}`)}
          >
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push(`/admin/students/${student.id}/edit`)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleDelete}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {dialog}
    </>
  );
}

const testLevelColors: Record<string, string> = {
  "Basic": "default",
  "Everyday A": "secondary",
  "Everyday B": "secondary",
  "Speak Up": "outline",
  "Business English": "outline",
  "1-on-1": "default",
};

export const columns: ColumnDef<Student>[] = [
  {
    accessorKey: "internal_code",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Internal Code
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "user.full_name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Full Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "user.email",
    header: "Email",
  },
  {
    accessorKey: "test_level",
    header: "Test Level",
    cell: ({ row }) => {
      const level = row.getValue("test_level") as string;
      if (!level) return "N/A";
      
      return (
        <Badge variant={testLevelColors[level] as any || "default"}>
          {level}
        </Badge>
      );
    },
  },
  {
    accessorKey: "course_type",
    header: "Course Type",
    cell: ({ row }) => {
      const type = row.getValue("course_type") as string;
      return type ? (
        <Badge variant="outline">
          {type}
        </Badge>
      ) : "N/A";
    },
  },
  {
    id: "hours",
    header: "Hours Progress",
    cell: ({ row }) => {
      const student = row.original;
      const totalHours = student.hours_tutored + student.hours_remaining;
      const percentage = totalHours > 0 
        ? (student.hours_tutored / totalHours) * 100 
        : 0;
      
      return (
        <div className="w-full">
          <div className="flex justify-between text-sm mb-1">
            <span>{student.hours_tutored} / {totalHours}</span>
            <span>{percentage.toFixed(0)}%</span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: "Enrolled",
    cell: ({ row }) => {
      return new Date(row.getValue("created_at")).toLocaleDateString();
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionsCell student={row.original} />,
  },
];