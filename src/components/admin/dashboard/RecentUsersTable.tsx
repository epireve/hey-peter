"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";

interface User {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "teacher" | "student";
  created_at: string;
  status?: "active" | "inactive" | "pending";
  avatar_url?: string;
}

interface RecentUsersTableProps {
  users: User[];
  title?: string;
  description?: string;
}

const roleColors = {
  admin: "destructive",
  teacher: "default",
  student: "secondary",
} as const;

const statusColors = {
  active: "default",
  inactive: "secondary",
  pending: "outline",
} as const;

export function RecentUsersTable({
  users,
  title = "Recent Users",
  description = "New user registrations",
}: RecentUsersTableProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url} alt={user.full_name} />
                      <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{user.full_name}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={roleColors[user.role]}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={statusColors[user.status || "active"]}>
                    {user.status || "active"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}