'use client';

import React, { useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, Upload } from 'lucide-react';
import { ImportExportDialog } from '../ImportExportDialog';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

interface TeachersPageClientProps {
  initialTeachers: any[];
  columns: any[];
}

export function TeachersPageClient({ initialTeachers, columns }: TeachersPageClientProps) {
  const [teachers, setTeachers] = useState(initialTeachers);
  const [importExportOpen, setImportExportOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();

  const importColumns = [
    { key: 'email', header: 'Email', required: true },
    { key: 'full_name', header: 'Full Name', required: true },
    { key: 'phone_number', header: 'Phone Number' },
    { key: 'date_of_birth', header: 'Date of Birth', transform: (value: any) => value ? new Date(value).toISOString() : null },
    { key: 'gender', header: 'Gender' },
    { key: 'address', header: 'Address' },
    { key: 'bio', header: 'Bio' },
    { key: 'specializations', header: 'Specializations (comma-separated)', transform: (value: any) => value ? value.split(',').map((s: string) => s.trim()) : [] },
    { key: 'experience_years', header: 'Years of Experience', transform: (value: any) => parseInt(value) || 0 },
    { key: 'hourly_rate', header: 'Hourly Rate', transform: (value: any) => parseFloat(value) || 0 },
    { key: 'languages', header: 'Languages (comma-separated)', transform: (value: any) => value ? value.split(',').map((s: string) => s.trim()) : [] },
  ];

  const handleImport = async (data: any[]) => {
    try {
      // Process each teacher
      for (const teacherData of data) {
        // First create the user account
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: teacherData.email,
          email_confirm: true,
          user_metadata: {
            full_name: teacherData.full_name,
            role: 'teacher',
          },
        });

        if (authError) throw authError;

        // Then create the teacher profile
        const { error: profileError } = await supabase
          .from('teachers')
          .insert({
            user_id: authData.user.id,
            full_name: teacherData.full_name,
            email: teacherData.email,
            phone_number: teacherData.phone_number,
            date_of_birth: teacherData.date_of_birth,
            gender: teacherData.gender,
            address: teacherData.address,
            bio: teacherData.bio,
            profile_data: {
              specializations: teacherData.specializations || [],
              experience_years: teacherData.experience_years || 0,
              hourly_rate: teacherData.hourly_rate || 0,
              languages: teacherData.languages || [],
            },
            status: 'active',
          });

        if (profileError) throw profileError;
      }

      toast({
        title: 'Import successful',
        description: `Imported ${data.length} teachers successfully`,
      });

      // Refresh the page to show new data
      router.refresh();
    } catch (error) {
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Failed to import teachers',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleExport = async () => {
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data for export
      return (data || []).map(teacher => ({
        email: teacher.email,
        full_name: teacher.full_name,
        phone_number: teacher.phone_number || '',
        date_of_birth: teacher.date_of_birth || '',
        gender: teacher.gender || '',
        address: teacher.address || '',
        bio: teacher.bio || '',
        specializations: teacher.profile_data?.specializations?.join(', ') || '',
        experience_years: teacher.profile_data?.experience_years || 0,
        hourly_rate: teacher.profile_data?.hourly_rate || 0,
        languages: teacher.profile_data?.languages?.join(', ') || '',
        status: teacher.status,
        created_at: teacher.created_at,
      }));
    } catch (error) {
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Failed to export teachers',
        variant: 'destructive',
      });
      throw error;
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Teachers</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportExportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import/Export
          </Button>
          <Link href="/admin/teachers/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Teacher
            </Button>
          </Link>
        </div>
      </div>

      <DataTable columns={columns} data={teachers} />

      <ImportExportDialog
        open={importExportOpen}
        onOpenChange={setImportExportOpen}
        entityType="teachers"
        onImport={handleImport}
        onExport={handleExport}
        columns={importColumns}
      />
    </div>
  );
}