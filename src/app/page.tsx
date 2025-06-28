import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="max-w-md p-8 space-y-4 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-gray-100">
          Welcome to the Admin Portal
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-400">
          Please log in to continue.
        </p>
        <Link
          href="/auth/login"
          className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
        >
          Go to Login
        </Link>
      </div>
    </div>
  );
}
