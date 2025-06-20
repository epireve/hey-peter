import React from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-gray-800 text-white">
        <div className="p-4">
          <h1 className="text-2xl font-bold">Admin Portal</h1>
        </div>
        <nav className="mt-8">
          <ul>
            <li className="px-4 py-2 hover:bg-gray-700">
              <a href="/admin/dashboard">Dashboard</a>
            </li>
            <li className="px-4 py-2 hover:bg-gray-700">
              <a href="/admin/users">Users</a>
            </li>
            <li className="px-4 py-2 hover:bg-gray-700">
              <a href="/admin/classes">Classes</a>
            </li>
            <li className="px-4 py-2 hover:bg-gray-700">
              <a href="/admin/bookings">Bookings</a>
            </li>
            <li className="px-4 py-2 hover:bg-gray-700">
              <a href="/admin/reports">Reports</a>
            </li>
            <li className="px-4 py-2 hover:bg-gray-700">
              <a href="/admin/settings">Settings</a>
            </li>
          </ul>
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
