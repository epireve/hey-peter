"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

import { createStudentSchema, type CreateStudentData } from "@/lib/services/student-service";
import { studentService } from "@/lib/services/student-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";

interface StudentFormProps {
  student?: any; // For edit mode
  mode?: "create" | "edit";
}

export const StudentForm = React.memo(({ student, mode = "create" }: StudentFormProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  const defaultValues = React.useMemo(() => ({
    email: student?.user?.email || "",
    full_name: student?.user?.full_name || "",
    password: "",
    internal_code: student?.internal_code || "",
    test_level: student?.test_level || undefined,
    course_type: student?.course_type || "Offline",
    total_hours: student?.hours_remaining || 0,
    gender: student?.metadata?.gender || undefined,
    photo_url: student?.metadata?.photo_url || "",
    purchased_materials: student?.metadata?.purchased_materials || false,
    lead_source: student?.metadata?.lead_source || "",
    sales_representative: student?.metadata?.sales_representative || "",
    payment_amount: student?.metadata?.payment_amount || undefined,
    discount: student?.metadata?.discount || 0,
  }), [student]);

  const form = useForm<CreateStudentData>({
    resolver: zodResolver(createStudentSchema),
    defaultValues,
  });

  const onSubmit = React.useCallback(async (data: CreateStudentData) => {
    setIsLoading(true);
    try {
      if (mode === "create") {
        const result = await studentService.createStudent(data);
        
        if (result.error) {
          toast.error(result.error.message || "Failed to create student");
        } else {
          toast.success("Student account created successfully");
          router.push("/admin/students");
          router.refresh();
        }
      } else {
        const result = await studentService.updateStudent(student.id, data);
        
        if (result.error) {
          toast.error(result.error.message || "Failed to update student");
        } else {
          toast.success("Student updated successfully");
          router.push("/admin/students");
          router.refresh();
        }
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [mode, student?.id, router]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              Basic account details for the student
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="student@example.com"
                      {...field}
                      disabled={mode === "edit"}
                    />
                  </FormControl>
                  <FormDescription>
                    This will be used for login
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {mode === "create" && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter password"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Must be at least 8 characters
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        {/* Student Information */}
        <Card>
          <CardHeader>
            <CardTitle>Student Information</CardTitle>
            <CardDescription>
              Student-specific details and enrollment information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="internal_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Internal Code</FormLabel>
                    <FormControl>
                      <Input placeholder="F7" {...field} />
                    </FormControl>
                    <FormDescription>
                      e.g., F7 (F = coach code, 7 = student number)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="test_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Test Level</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select test level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Basic">Basic</SelectItem>
                      <SelectItem value="Everyday A">Everyday A</SelectItem>
                      <SelectItem value="Everyday B">Everyday B</SelectItem>
                      <SelectItem value="Speak Up">Speak Up</SelectItem>
                      <SelectItem value="Business English">Business English</SelectItem>
                      <SelectItem value="1-on-1">1-on-1</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="course_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select course type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Online">Online</SelectItem>
                        <SelectItem value="Offline">Offline</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="total_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Course Hours</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="purchased_materials"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Teaching Materials</FormLabel>
                    <FormDescription>
                      Has the student purchased teaching materials?
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Payment Information */}
        <Card>
          <CardHeader>
            <CardTitle>Payment & Enrollment</CardTitle>
            <CardDescription>
              Payment details and enrollment information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="payment_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        min="0"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="discount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        min="0"
                        max="100"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="payment_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Date</FormLabel>
                    <FormControl>
                      <DatePicker
                        date={field.value ? new Date(field.value) : undefined}
                        onDateChange={(date) => 
                          field.onChange(date ? date.toISOString() : undefined)
                        }
                        placeholder="Select payment date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="course_start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course Start Date</FormLabel>
                    <FormControl>
                      <DatePicker
                        date={field.value ? new Date(field.value) : undefined}
                        onDateChange={(date) => 
                          field.onChange(date ? date.toISOString() : undefined)
                        }
                        placeholder="Select start date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="lead_source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lead Source (Referrer)</FormLabel>
                  <FormControl>
                    <Input placeholder="How did they hear about us?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sales_representative"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sales Representative</FormLabel>
                  <FormControl>
                    <Input placeholder="Assistant teacher name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={React.useCallback(() => router.push("/admin/students"), [router])}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "create" ? "Create Student" : "Update Student"}
          </Button>
        </div>
      </form>
    </Form>
  );
});

StudentForm.displayName = "StudentForm";