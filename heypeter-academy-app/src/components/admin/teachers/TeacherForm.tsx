"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";

import { teacherFormSchema, type TeacherFormData } from "@/lib/schemas/teacher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form-field";
import { DynamicFormGenerator } from "@/components/ui/dynamic-form-generator";
import { toast } from "sonner";
import { createTeacher } from "@/lib/actions/teacher";

export function TeacherForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<TeacherFormData>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: {
      email: "",
      full_name: "",
      password: "",
      coach_code: "",
      availability: {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: [],
      },
      compensation: {
        hourly_rate: 0,
        payment_method: "bank_transfer",
        bank_details: "",
        notes: "",
      },
      send_credentials: true,
      activate_immediately: true,
    },
  });

  async function onSubmit(data: TeacherFormData) {
    setIsLoading(true);
    try {
      const result = await createTeacher(data);
      
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Teacher account created successfully");
        
        if (data.send_credentials) {
          toast.info(`Login credentials have been sent to ${data.email}`);
        }
        
        router.push("/admin/teachers");
        router.refresh();
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const formSections = [
    {
      title: "Basic Information",
      description: "Teacher's personal and account information",
      fields: [
        {
          type: "email" as const,
          name: "email",
          label: "Email Address",
          placeholder: "teacher@example.com",
          required: true,
          description: "This will be used for login",
        },
        {
          type: "text" as const,
          name: "full_name",
          label: "Full Name",
          placeholder: "John Doe",
          required: true,
        },
        {
          type: "password" as const,
          name: "password",
          label: "Password",
          placeholder: "Enter password",
          required: true,
          description: "Must be at least 8 characters",
        },
        {
          type: "text" as const,
          name: "coach_code",
          label: "Coach Code",
          placeholder: "F7",
          required: true,
          description: "Unique identifier for the teacher (e.g., F7)",
        },
      ],
    },
    {
      title: "Compensation Details",
      description: "Payment and compensation information",
      fields: [
        {
          type: "number" as const,
          name: "compensation.hourly_rate",
          label: "Hourly Rate",
          placeholder: "0",
          required: true,
          min: 0,
          step: 0.01,
        },
        {
          type: "select" as const,
          name: "compensation.payment_method",
          label: "Payment Method",
          placeholder: "Select payment method",
          required: true,
          options: [
            { label: "Bank Transfer", value: "bank_transfer" },
            { label: "PayPal", value: "paypal" },
            { label: "Cash", value: "cash" },
            { label: "Other", value: "other" },
          ],
        },
        {
          type: "textarea" as const,
          name: "compensation.bank_details",
          label: "Bank Details",
          placeholder: "Enter bank account details",
          rows: 3,
        },
        {
          type: "textarea" as const,
          name: "compensation.notes",
          label: "Additional Notes",
          placeholder: "Any additional compensation notes",
          rows: 2,
        },
      ],
    },
    {
      title: "Account Settings",
      description: "Configure account activation and notifications",
      fields: [
        {
          type: "switch" as const,
          name: "send_credentials",
          label: "Send Credentials",
          switchLabel: "Email login credentials to teacher",
        },
        {
          type: "switch" as const,
          name: "activate_immediately",
          label: "Activate Account",
          switchLabel: "Activate account immediately",
        },
      ],
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Teacher Account</CardTitle>
        <CardDescription>
          Add a new teacher to the system. Login credentials will be sent via email.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <DynamicFormGenerator
              sections={formSections}
              schema={teacherFormSchema}
              loading={isLoading}
              submitLabel={isLoading ? "Creating..." : "Create Teacher"}
              showReset={true}
              onSubmit={onSubmit}
              defaultValues={form.getValues()}
            />
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}