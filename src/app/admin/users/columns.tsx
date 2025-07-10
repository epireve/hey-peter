"use client";

import { ColumnDef } from "@tanstack/react-table";
import { formatDate } from "@/lib/utils/date";

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type User = {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "teacher" | "student";
  created_at: string;
};

export const columns: ColumnDef<User>[] = [
  {
    accessorKey: "full_name",
    header: "Full Name",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "role",
    header: "Role",
  },
  {
    accessorKey: "created_at",
    header: "Created At",
    cell: ({ row }) => {
      return formatDate(row.getValue("created_at"));
    },
  },
];
