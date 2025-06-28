'use client';

import React, { useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { columns } from '@/app/admin/users/columns';
import { UserManagementWorkflow } from './UserManagementWorkflow';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Shield, Activity, UserPlus, Upload, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ImportExportDialog } from '@/components/admin/ImportExportDialog';
import { toast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { validators, mappers } from '@/lib/utils/import-export';

interface UserManagementClientProps {
  initialUsers: any[];
}

export function UserManagementClient({ initialUsers }: UserManagementClientProps) {
  const [users] = useState(initialUsers);
  const [showImportExport, setShowImportExport] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleRefresh = () => {
    router.refresh();
  };

  const columnMappings = [
    {
      field: 'email',
      label: 'Email',
      required: true,
      validator: validators.email
    },
    {
      field: 'fullName',
      label: 'Full Name',
      required: true
    },
    {
      field: 'role',
      label: 'Role',
      required: true,
      validator: validators.enum(['student', 'teacher', 'admin'])
    }
  ];

  const handleImport = async (data: any[]) => {
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const record of data) {
        try {
          // Create user via Supabase Admin API
          const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
            email: record.email,
            email_confirm: true,
            user_metadata: {
              full_name: record.fullName,
              role: record.role
            }
          });

          if (userError) throw userError;

          // Create corresponding profile based on role
          if (newUser.user) {
            if (record.role === 'student') {
              const { error: profileError } = await supabase
                .from('students')
                .insert({
                  id: newUser.user.id,
                  email: record.email,
                  full_name: record.fullName,
                  created_at: new Date().toISOString()
                });
              if (profileError) throw profileError;
            } else if (record.role === 'teacher') {
              const { error: profileError } = await supabase
                .from('teachers')
                .insert({
                  id: newUser.user.id,
                  email: record.email,
                  full_name: record.fullName,
                  created_at: new Date().toISOString()
                });
              if (profileError) throw profileError;
            }
          }

          successCount++;
        } catch (error) {
          errorCount++;
          console.error('Error importing user:', error);
        }
      }

      toast({
        title: 'Import completed',
        description: `Successfully imported ${successCount} users. ${errorCount} errors.`,
      });

      handleRefresh();
    } catch (error) {
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    }
  };

  const handleExport = async () => {
    return users.map(user => ({
      email: user.email,
      fullName: user.user_metadata?.full_name || '',
      role: user.user_metadata?.role || 'student',
      created: new Date(user.created_at).toLocaleDateString(),
      lastSignIn: user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never',
      status: user.banned ? 'Banned' : (!user.email_confirmed_at ? 'Pending' : 'Active')
    }));
  };

  // Calculate statistics
  const stats = {
    total: users.length,
    active: users.filter(u => !u.banned && u.email_confirmed_at && u.last_sign_in_at).length,
    pending: users.filter(u => !u.email_confirmed_at).length,
    banned: users.filter(u => u.banned).length,
    students: users.filter(u => u.user_metadata?.role === 'student').length,
    teachers: users.filter(u => u.user_metadata?.role === 'teacher').length,
    admins: users.filter(u => u.user_metadata?.role === 'admin').length,
  };

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">User Management</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportExport(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import/Export
          </Button>
          <Button onClick={() => router.push('/admin/users/new')}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.active} active, {stats.pending} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.students}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((stats.students / stats.total) * 100)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teachers</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.teachers}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((stats.teachers / stats.total) * 100)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.admins}</div>
            <p className="text-xs text-muted-foreground">
              {stats.banned} banned users
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="table" className="space-y-4">
        <TabsList>
          <TabsTrigger value="table">User List</TabsTrigger>
          <TabsTrigger value="workflow">User Workflow</TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>
                View and manage all users in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={columns} data={users} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflow" className="space-y-4">
          <UserManagementWorkflow users={users} onRefresh={handleRefresh} />
        </TabsContent>
      </Tabs>

      <ImportExportDialog
        open={showImportExport}
        onOpenChange={setShowImportExport}
        title="Import/Export Users"
        description="Import users from CSV or Excel files, or export existing users"
        columns={columnMappings}
        onImport={handleImport}
        onExport={handleExport}
        templateUrl="/templates/users_template.csv"
      />
    </div>
  );
}