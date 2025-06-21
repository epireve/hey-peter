import { getUsers } from "@/lib/actions/user";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "./columns";

export default async function UsersPage() {
  const { data: users, error } = await getUsers();

  if (error) {
    return <div>{error.message}</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="mb-4 text-2xl font-bold">Users</h1>
      <DataTable columns={columns} data={users || []} />
    </div>
  );
}
