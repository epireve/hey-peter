"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";
import { resetPasswordUpdateSchema } from "@/lib/validations";
import { resetPasswordUpdate } from "@/lib/actions/auth";
import { useRouter } from "next/navigation";

export default function UpdatePasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const form = useForm<z.infer<typeof resetPasswordUpdateSchema>>({
    resolver: zodResolver(resetPasswordUpdateSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof resetPasswordUpdateSchema>) {
    setIsLoading(true);
    const result = await resetPasswordUpdate(values);
    if (result?.error) {
      toast.error(result.error.message || "Failed to update password");
    } else {
      toast.success(result?.data?.message || "Password updated successfully");
      router.push("/login");
    }
    setIsLoading(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Password*</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm New Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Updating..." : "Update Password"}
        </Button>
      </form>
    </Form>
  );
}
