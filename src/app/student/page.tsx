export default function StudentPage() {
  return (
    <div className="container mx-auto p-4">
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Student Dashboard</h1>
        <p className="text-gray-600">
          Welcome to HeyPeter Academy Student Portal
        </p>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 border rounded-lg">
            <h3 className="font-semibold mb-2">My Classes</h3>
            <p className="text-sm text-gray-600">View and manage your scheduled classes</p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="font-semibold mb-2">Hour Balance</h3>
            <p className="text-sm text-gray-600">Check your remaining class hours</p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="font-semibold mb-2">Progress</h3>
            <p className="text-sm text-gray-600">Track your learning progress</p>
          </div>
        </div>
      </div>
    </div>
  );
}
