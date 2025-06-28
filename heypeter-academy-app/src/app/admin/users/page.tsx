import { getUsers } from "@/lib/actions/user";
import { UserManagementClient } from "@/components/admin/users/UserManagementClient";

export default async function UsersPage() {
  const { data: users, error } = await getUsers();

  if (error) {
    return <div className="p-4 text-red-500">Error: {error.message || "Failed to load users"}</div>;
  }

  return <UserManagementClient initialUsers={users || []} />;
}
