'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/supabase';

const userSchema = z.object({
  email: z.string().email('Invalid email address'),
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  role: z.enum(['student', 'teacher', 'admin']),
  send_invite: z.boolean().default(true),
});

type UserFormData = z.infer<typeof userSchema>;

export default function NewUserPage() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: '',
      full_name: '',
      role: 'student',
      send_invite: true,
    },
  });

  const onSubmit = async (data: UserFormData) => {
    try {
      // Create the user account
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: data.email,
        email_confirm: !data.send_invite,
        user_metadata: {
          full_name: data.full_name,
          role: data.role,
        },
      });

      if (authError) throw authError;

      // Create the corresponding profile based on role
      if (data.role === 'student') {
        const { error: profileError } = await supabase.from('students').insert({
          user_id: authData.user.id,
          full_name: data.full_name,
          email: data.email,
          status: 'active',
        });
        if (profileError) throw profileError;
      } else if (data.role === 'teacher') {
        const { error: profileError } = await supabase.from('teachers').insert({
          user_id: authData.user.id,
          full_name: data.full_name,
          email: data.email,
          status: 'active',
        });
        if (profileError) throw profileError;
      }

      // Send invitation email if requested
      if (data.send_invite) {
        await supabase.auth.admin.inviteUserByEmail(data.email, {
          data: {
            full_name: data.full_name,
            role: data.role,
          },
        });
      }

      toast({
        title: 'User created successfully',
        description: data.send_invite 
          ? `Invitation sent to ${data.email}` 
          : `User ${data.email} created without invitation`,
      });

      router.push('/admin/users');
    } catch (error) {
      toast({
        title: 'Failed to create user',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => router.push('/admin/users')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Users
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Add New User</CardTitle>
            <CardDescription>
              Create a new user account and optionally send an invitation email
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="user@example.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        The user's email address for login
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
                      <FormDescription>
                        The user's display name
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="teacher">Teacher</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The user's role determines their permissions
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="send_invite"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Send invitation email
                        </FormLabel>
                        <FormDescription>
                          Send an email to the user with login instructions
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <div className="flex gap-4">
                  <Button type="submit">Create User</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/admin/users')}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}