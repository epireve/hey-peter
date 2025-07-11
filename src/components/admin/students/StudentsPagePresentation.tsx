'use client';

import React from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, Upload, Download, RefreshCw, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import { ImportExportDialog } from '../ImportExportDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ColumnDef } from '@tanstack/react-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface Student {
  id: string;
  email: string;
  full_name: string;
  status?: 'active' | 'inactive' | 'suspended';
  created_at: string;
  profile_data?: {
    phone_number?: string;
    date_of_birth?: string;
    gender?: string;
    address?: string;
    emergency_contact?: {
      name?: string;
      phone?: string;
    };
    notes?: string;
  };
  user?: {
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

export interface StudentsPagePresentationProps {
  students: Student[];
  loading?: boolean;
  importExportOpen: boolean;
  importColumns: any[];
  onImportExportOpenChange: (open: boolean) => void;
  onImport: (data: any[]) => Promise<void>;
  onExport: () => Promise<any[]>;
  onAddStudent: () => void;
  onEditStudent: (studentId: string) => void;
  onDeleteStudent: (studentId: string) => void;
  onRefresh: () => void;
}

/**
 * Presentational component for Students Page
 * Handles all UI rendering without any business logic
 */
export const StudentsPagePresentation: React.FC<StudentsPagePresentationProps> = ({
  students,
  loading = false,
  importExportOpen,
  importColumns,
  onImportExportOpenChange,
  onImport,
  onExport,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  onRefresh,
}) => {
  // Define table columns
  const columns: ColumnDef<Student>[] = React.useMemo(() => [
    {
      accessorKey: 'full_name',
      header: 'Name',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.full_name}</div>
          <div className="text-sm text-muted-foreground">{row.original.email}</div>
        </div>
      ),
    },
    {
      accessorKey: 'profile_data.phone_number',
      header: 'Phone',
      cell: ({ row }) => row.original.profile_data?.phone_number || '-',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status || 'active';
        const statusColors = {
          active: 'bg-green-100 text-green-800',
          inactive: 'bg-gray-100 text-gray-800',
          suspended: 'bg-red-100 text-red-800',
        };
        return (
          <Badge className={statusColors[status]}>
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Joined',
      cell: ({ row }) => format(new Date(row.original.created_at), 'MMM dd, yyyy'),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEditStudent(row.original.id)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDeleteStudent(row.original.id)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [onEditStudent, onDeleteStudent]);

  if (loading && students.length === 0) {
    return <StudentsPageSkeleton />;
  }

  return (
    <div className="container mx-auto py-10">
      <StudentsPageHeader
        onImportExportClick={() => onImportExportOpenChange(true)}
        onAddClick={onAddStudent}
        onRefresh={onRefresh}
        loading={loading}
      />

      <DataTable 
        columns={columns} 
        data={students} 
        filterColumn="full_name"
        filterPlaceholder="Filter by name..." 
      />

      <ImportExportDialog
        open={importExportOpen}
        onOpenChange={onImportExportOpenChange}
        entityType="students"
        onImport={onImport}
        onExport={onExport}
        columns={importColumns}
      />
    </div>
  );
};

StudentsPagePresentation.displayName = 'StudentsPagePresentation';

/**
 * Page Header Component
 */
const StudentsPageHeader: React.FC<{
  onImportExportClick: () => void;
  onAddClick: () => void;
  onRefresh: () => void;
  loading?: boolean;
}> = ({ onImportExportClick, onAddClick, onRefresh, loading }) => (
  <div className="flex items-center justify-between mb-6">
    <h1 className="text-3xl font-bold">Students</h1>
    <div className="flex gap-2">
      <Button 
        variant="outline" 
        onClick={onRefresh}
        disabled={loading}
      >
        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
      <Button variant="outline" onClick={onImportExportClick}>
        <Upload className="mr-2 h-4 w-4" />
        Import/Export
      </Button>
      <Button onClick={onAddClick}>
        <Plus className="mr-2 h-4 w-4" />
        Add Student
      </Button>
    </div>
  </div>
);

/**
 * Loading Skeleton Component
 */
const StudentsPageSkeleton: React.FC = () => (
  <div className="container mx-auto py-10">
    <div className="flex items-center justify-between mb-6">
      <Skeleton className="h-9 w-32" />
      <div className="flex gap-2">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
      </div>
    </div>
    
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  </div>
);