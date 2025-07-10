import Link from "next/link";
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  Calendar, 
  BookOpen,
  BarChart3, 
  Settings,
  UserCheck,
  FileText
} from "lucide-react";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/students", label: "Students", icon: GraduationCap },
  { href: "/admin/teachers", label: "Teachers", icon: UserCheck },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/courses", label: "Courses", icon: BookOpen },
  { href: "/admin/content", label: "Content", icon: FileText },
  { href: "/admin/classes", label: "Classes", icon: Calendar },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 bg-card border-r">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-foreground">HeyPeter Academy</h1>
          <p className="text-sm text-muted-foreground">Admin Portal</p>
        </div>
        <nav className="p-4">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
