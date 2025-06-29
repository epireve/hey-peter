import UpdatePasswordForm from "@/components/auth/UpdatePasswordForm";

export default function PasswordUpdatePage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm">
        <h1 className="mb-4 text-center text-2xl font-bold">Update Password</h1>
        <UpdatePasswordForm />
      </div>
    </div>
  );
}
