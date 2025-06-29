import PasswordResetForm from "@/components/auth/PasswordResetForm";

export default function PasswordResetPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm">
        <h1 className="mb-4 text-center text-2xl font-bold">Reset Password</h1>
        <PasswordResetForm />
      </div>
    </div>
  );
}
