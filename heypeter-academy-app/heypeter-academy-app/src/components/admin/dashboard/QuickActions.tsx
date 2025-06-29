"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  UserPlus, 
  Calendar, 
  FileText, 
  Settings,
  BookOpen
} from "lucide-react";
import Link from "next/link";

interface QuickAction {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  variant?: "default" | "secondary" | "outline";
}

const quickActions: QuickAction[] = [
  {
    title: "Add Teacher",
    description: "Create a new teacher account",
    icon: <UserPlus className="h-4 w-4" />,
    href: "/admin/teachers/new",
    variant: "default",
  },
  {
    title: "Add Student",
    description: "Register a new student",
    icon: <Users className="h-4 w-4" />,
    href: "/admin/students/new",
    variant: "default",
  },
  {
    title: "Schedule Class",
    description: "Create a new class schedule",
    icon: <Calendar className="h-4 w-4" />,
    href: "/admin/classes/new",
    variant: "secondary",
  },
  {
    title: "Upload Materials",
    description: "Add course materials",
    icon: <FileText className="h-4 w-4" />,
    href: "/admin/materials/new",
    variant: "secondary",
  },
  {
    title: "View Courses",
    description: "Manage course catalog",
    icon: <BookOpen className="h-4 w-4" />,
    href: "/admin/courses",
    variant: "outline",
  },
  {
    title: "Settings",
    description: "System configuration",
    icon: <Settings className="h-4 w-4" />,
    href: "/admin/settings",
    variant: "outline",
  },
];

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common administrative tasks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Button
                variant={action.variant}
                className="w-full justify-start"
              >
                {action.icon}
                <div className="ml-3 text-left">
                  <div className="font-medium">{action.title}</div>
                  <div className="text-xs opacity-70">{action.description}</div>
                </div>
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}