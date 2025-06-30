"use client";

import { useAuthStore } from "@/lib/store";

export default function DashboardPage() {
  const { user, role } = useAuthStore();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p>Welcome, {user?.email}</p>
      <p>Your role is: {role}</p>
    </div>
  );
}
