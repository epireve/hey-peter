import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Users</CardTitle>
            <CardDescription>
              The total number of registered users.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">1,234</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Teachers</CardTitle>
            <CardDescription>
              The total number of registered teachers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">56</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Students</CardTitle>
            <CardDescription>
              The total number of registered students.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">1,178</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
