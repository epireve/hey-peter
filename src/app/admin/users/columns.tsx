"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export type User = {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "teacher" | "student";
  created_at: string;
  updated_at: string;
  email_confirmed_at?: string;
  last_sign_in_at?: string;
  banned?: boolean;
};

function ActionsCell({ user }: { user: User }) {
  const router = useRouter();

  const handleEdit = () => {
    router.push(`/admin/users/${user.id}/edit`);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this user?")) {
      return;
    }
    
    try {
      // TODO: Implement delete user action
      toast.error("Delete functionality not yet implemented");
    } catch (error) {
      toast.error("Failed to delete user");
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
          onClick={() => navigator.clipboard.writeText(user.email)}
        >
          Copy email
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push(`/admin/users/${user.id}`)}>
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleEdit}>
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

export const columns: ColumnDef<User>[] = [
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "full_name",
    header: "Full Name",
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const role = row.getValue("role") as string;
      return (
        <Badge variant={
          role === "admin" ? "destructive" : 
          role === "teacher" ? "secondary" : 
          "default"
        }>
          {role}
        </Badge>
      );
    },
  },
  {
    accessorKey: "email_confirmed_at",
    header: "Email Confirmed",
    cell: ({ row }) => {
      const date = row.getValue("email_confirmed_at") as string;
      return date ? (
        <Badge variant="outline" className="text-green-600">
          Confirmed
        </Badge>
      ) : (
        <Badge variant="outline" className="text-yellow-600">
          Pending
        </Badge>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => {
      const date = row.getValue("created_at") as string;
      return date ? format(new Date(date), "MMM dd, yyyy") : "-";
    },
  },
  {
    accessorKey: "last_sign_in_at",
    header: "Last Sign In",
    cell: ({ row }) => {
      const date = row.getValue("last_sign_in_at") as string;
      return date ? format(new Date(date), "MMM dd, yyyy HH:mm") : "Never";
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionsCell user={row.original} />,
  },
];