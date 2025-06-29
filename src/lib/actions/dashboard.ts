"use server";

import { supabase } from "@/lib/supabase";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

export async function getDashboardStats() {
  try {
    // Get total counts
    const [
      { count: totalStudents },
      { count: totalTeachers },
      { count: totalClasses },
      { count: totalCourses }
    ] = await Promise.all([
      supabase.from("students").select("*", { count: "exact", head: true }),
      supabase.from("teachers").select("*", { count: "exact", head: true }),
      supabase.from("classes").select("*", { count: "exact", head: true }),
      supabase.from("courses").select("*", { count: "exact", head: true }),
    ]);

    // Get monthly comparisons
    const currentMonthStart = startOfMonth(new Date());
    const lastMonthStart = startOfMonth(subMonths(new Date(), 1));
    const lastMonthEnd = endOfMonth(subMonths(new Date(), 1));

    const { count: newStudentsThisMonth } = await supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .gte("created_at", currentMonthStart.toISOString());

    const { count: newStudentsLastMonth } = await supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .gte("created_at", lastMonthStart.toISOString())
      .lte("created_at", lastMonthEnd.toISOString());

    // Calculate trends
    const studentGrowth = newStudentsLastMonth
      ? ((newStudentsThisMonth! - newStudentsLastMonth) / newStudentsLastMonth) * 100
      : 0;

    return {
      data: {
        totalStudents: totalStudents || 0,
        totalTeachers: totalTeachers || 0,
        totalClasses: totalClasses || 0,
        totalCourses: totalCourses || 0,
        studentGrowth: Number(studentGrowth.toFixed(1)),
        newStudentsThisMonth: newStudentsThisMonth || 0,
      },
    };
  } catch (error) {
    return { error: "Failed to fetch dashboard stats" };
  }
}

export async function getRecentUsers(limit = 5) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { error: error.message };
  }

  return { data };
}

export async function getClassAttendanceData() {
  try {
    // This is mock data - replace with actual query
    const data = [
      { name: "Mon", attended: 85, absent: 15 },
      { name: "Tue", attended: 92, absent: 8 },
      { name: "Wed", attended: 88, absent: 12 },
      { name: "Thu", attended: 90, absent: 10 },
      { name: "Fri", attended: 87, absent: 13 },
      { name: "Sat", attended: 82, absent: 18 },
      { name: "Sun", attended: 78, absent: 22 },
    ];

    return { data };
  } catch (error) {
    return { error: "Failed to fetch attendance data" };
  }
}

export async function getCourseDistribution() {
  try {
    // This is mock data - replace with actual query
    const data = [
      { name: "Basic", value: 35, students: 420 },
      { name: "Everyday A", value: 25, students: 300 },
      { name: "Everyday B", value: 20, students: 240 },
      { name: "Speak Up", value: 15, students: 180 },
      { name: "Business", value: 5, students: 60 },
    ];

    return { data };
  } catch (error) {
    return { error: "Failed to fetch course distribution" };
  }
}

export async function getMonthlyRevenue() {
  try {
    // This is mock data - replace with actual query
    const data = [
      { month: "Jan", revenue: 45000 },
      { month: "Feb", revenue: 52000 },
      { month: "Mar", revenue: 48000 },
      { month: "Apr", revenue: 61000 },
      { month: "May", revenue: 58000 },
      { month: "Jun", revenue: 65000 },
    ];

    return { data };
  } catch (error) {
    return { error: "Failed to fetch revenue data" };
  }
}

export async function getRecentActivities(limit = 10) {
  try {
    // This is mock data - replace with actual audit log query
    const activities = [
      {
        id: "1",
        type: "user_joined" as const,
        title: "New student registered",
        description: "John Smith joined as a student",
        user: { name: "Admin User", role: "admin" },
        timestamp: new Date().toISOString(),
      },
      {
        id: "2",
        type: "class_scheduled" as const,
        title: "New class scheduled",
        description: "Business English - Advanced Level",
        user: { name: "Sarah Johnson", role: "teacher" },
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: "3",
        type: "material_uploaded" as const,
        title: "Course material uploaded",
        description: "Unit 5 - Speaking Practice.pdf",
        user: { name: "Mike Chen", role: "teacher" },
        timestamp: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        id: "4",
        type: "attendance_marked" as const,
        title: "Attendance recorded",
        description: "Morning class - 12 present, 2 absent",
        user: { name: "Emily Brown", role: "teacher" },
        timestamp: new Date(Date.now() - 10800000).toISOString(),
      },
      {
        id: "5",
        type: "class_completed" as const,
        title: "Class completed",
        description: "Everyday A - Unit 3 completed",
        user: { name: "David Lee", role: "teacher" },
        timestamp: new Date(Date.now() - 14400000).toISOString(),
      },
    ];

    return { data: activities.slice(0, limit) };
  } catch (error) {
    return { error: "Failed to fetch recent activities" };
  }
}