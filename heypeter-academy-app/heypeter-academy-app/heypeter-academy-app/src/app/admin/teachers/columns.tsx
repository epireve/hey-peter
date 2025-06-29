"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { deleteTeacher } from "@/lib/actions/teacher";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export type Teacher = {
  id: string;
  coach_code: string;
  availability?: any;
  compensation?: {
    hourly_rate: number;
    payment_method: string;
  };
  created_at: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
  };
};

function ActionsCell({ teacher }: { teacher: Teacher }) {
  const router = useRouter();

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this teacher?")) {
      const result = await deleteTeacher(teacher.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Teacher deleted successfully");
        router.refresh();
      }
    }
  };

  return (
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
          onClick={() => navigator.clipboard.writeText(teacher.user.email)}
        >
          Copy email
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push(`/admin/teachers/${teacher.id}/edit`)}
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
  );
}

export const columns: ColumnDef<Teacher>[] = [
  {
    accessorKey: "coach_code",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Coach Code
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
    accessorKey: "compensation.hourly_rate",
    header: "Hourly Rate",
    cell: ({ row }) => {
      const rate = row.original.compensation?.hourly_rate;
      return rate ? `$${rate.toFixed(2)}` : "N/A";
    },
  },
  {
    accessorKey: "compensation.payment_method",
    header: "Payment Method",
    cell: ({ row }) => {
      const method = row.original.compensation?.payment_method;
      if (!method) return "N/A";
      
      const methodLabels: Record<string, string> = {
        bank_transfer: "Bank Transfer",
        paypal: "PayPal",
        cash: "Cash",
        other: "Other",
      };
      
      return (
        <Badge variant="outline">
          {methodLabels[method] || method}
        </Badge>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => {
      return new Date(row.getValue("created_at")).toLocaleDateString();
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionsCell teacher={row.original} />,
  },
];