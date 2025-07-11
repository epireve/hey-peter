import { notFound } from "next/navigation";
import { getUser } from "@/lib/actions/user";
import { UserForm } from "@/components/admin/users/UserForm";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function UserEditPage({ params }: PageProps) {
  const { id } = await params;
  const result = await getUser(id);
  
  if (result.error || !result.data) {
    notFound();
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit User</h1>
        <p className="text-muted-foreground">
          Update user information and permissions
        </p>
      </div>
      
      <UserForm user={result.data} mode="edit" />
    </div>
  );
}