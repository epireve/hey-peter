import SignUpForm from "@/components/auth/SignUpForm";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm">
        <h1 className="mb-4 text-center text-2xl font-bold">Sign Up</h1>
        <SignUpForm />
      </div>
    </div>
  );
}
