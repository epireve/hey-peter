"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2, Download } from "lucide-react";

import { studentService, type Student } from "@/lib/services/student-service";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { useBulkProgress } from "@/components/ui/bulk-progress";
import { BulkProgressDialog } from "@/components/ui/bulk-progress";
import { BulkActionsToolbar, commonBulkActions } from "@/components/ui/bulk-actions-toolbar";
import { BulkConfirmationDialog, useBulkConfirmation } from "@/components/ui/bulk-confirmation-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface StudentListWithBulkProps {
  initialStudents: Student[];
}

export function StudentListWithBulk({ initialStudents }: StudentListWithBulkProps) {
  const router = useRouter();
  const [students, setStudents] = React.useState<Student[]>(initialStudents);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  // Bulk selection
  const bulkSelection = useBulkSelection({
    items: students,
    keyExtractor: (student) => student.id,
  });

  // Bulk progress
  const bulkProgress = useBulkProgress();

  // Bulk confirmation
  const bulkConfirmation = useBulkConfirmation();

  // Filter students based on search
  const filteredStudents = React.useMemo(() => {
    if (!searchTerm) return students;
    
    return students.filter(student =>
      student.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.internal_code?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [students, searchTerm]);

  // Refresh students list
  const refreshStudents = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await studentService.getAll();
      if (result.data) {
        setStudents(result.data);
      }
    } catch (error) {
      toast.error("Failed to refresh students list");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Bulk delete operation
  const handleBulkDelete = React.useCallback(async () => {
    const selectedItems = bulkSelection.selectedItems;
    if (selectedItems.length === 0) return;

    bulkProgress.startOperation(selectedItems.length);
    
    let completed = 0;
    let failed = 0;

    for (const student of selectedItems) {
      try {
        bulkProgress.updateProgress(completed, failed, `Deleting ${student.user?.full_name || student.id}`);
        
        const result = await studentService.delete(student.id);
        if (result.error) {
          failed++;
          bulkProgress.addError(`Failed to delete ${student.user?.full_name || student.id}: ${result.error.message}`);
        }
        completed++;
      } catch (error) {
        failed++;
        bulkProgress.addError(`Failed to delete ${student.user?.full_name || student.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        completed++;
      }
    }

    bulkProgress.completeOperation();
    bulkSelection.clearSelection();
    
    // Refresh the list
    await refreshStudents();
    
    const successCount = completed - failed;
    if (successCount > 0) {
      toast.success(`Successfully deleted ${successCount} student${successCount !== 1 ? 's' : ''}`);
    }
    if (failed > 0) {
      toast.error(`Failed to delete ${failed} student${failed !== 1 ? 's' : ''}`);
    }
  }, [bulkSelection.selectedItems, bulkProgress, bulkSelection, refreshStudents]);

  // Bulk export operation
  const handleBulkExport = React.useCallback(async () => {
    const selectedItems = bulkSelection.selectedItems;
    if (selectedItems.length === 0) return;

    bulkProgress.startOperation(selectedItems.length);
    
    try {
      // Create CSV content
      const headers = [
        "ID", "Full Name", "Email", "Internal Code", "Test Level", 
        "Course Type", "Hours Remaining", "Gender", "Lead Source", "Sales Rep"
      ];
      
      const csvContent = [
        headers.join(","),
        ...selectedItems.map(student => [
          student.id,
          `"${student.user?.full_name || ''}"`,
          `"${student.user?.email || ''}"`,
          `"${student.internal_code || ''}"`,
          `"${student.test_level || ''}"`,
          `"${student.course_type || ''}"`,
          student.hours_remaining || 0,
          `"${student.metadata?.gender || ''}"`,
          `"${student.metadata?.lead_source || ''}"`,
          `"${student.metadata?.sales_representative || ''}"`
        ].join(","))
      ].join("\n");

      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `students-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      bulkProgress.updateProgress(selectedItems.length, 0);
      bulkProgress.completeOperation();
      
      toast.success(`Exported ${selectedItems.length} student${selectedItems.length !== 1 ? 's' : ''}`);
    } catch (error) {
      bulkProgress.addError(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      bulkProgress.completeOperation();
      toast.error("Export failed");
    }
  }, [bulkSelection.selectedItems, bulkProgress]);

  // Bulk actions configuration
  const bulkActions = [
    commonBulkActions.delete(() => {
      const confirmationItems = bulkSelection.selectedItems.map(student => ({
        id: student.id,
        displayName: student.user?.full_name || student.user?.email || student.id,
        warning: student.hours_remaining > 0 ? `Student has ${student.hours_remaining} hours remaining` : undefined,
      }));

      // Show confirmation dialog before delete
      bulkConfirmation.confirm(handleBulkDelete);
    }),
    commonBulkActions.export(handleBulkExport),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Students</h1>
          <p className="text-muted-foreground">
            Manage student accounts and enrollment
          </p>
        </div>
        <Button onClick={() => router.push("/admin/students/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Add Student
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
          <CardDescription>
            Find students by name, email, or internal code
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar
        selectedCount={bulkSelection.selectedCount}
        actions={bulkActions}
        onClearSelection={bulkSelection.clearSelection}
      />

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Students ({filteredStudents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={bulkSelection.isAllSelected}
                    onCheckedChange={bulkSelection.toggleAll}
                    indeterminate={bulkSelection.isIndeterminate}
                    aria-label="Select all students"
                  />
                </TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Internal Code</TableHead>
                <TableHead>Test Level</TableHead>
                <TableHead>Course Type</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>
                    <Checkbox
                      checked={bulkSelection.isSelected(student)}
                      onCheckedChange={() => bulkSelection.toggleItem(student)}
                      aria-label={`Select ${student.user?.full_name || student.user?.email}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium">
                        {student.user?.full_name || "No name"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {student.user?.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {student.internal_code || "Not set"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {student.test_level || "Not assessed"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={student.course_type === "Online" ? "default" : "secondary"}>
                      {student.course_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={student.hours_remaining > 0 ? "default" : "destructive"}
                    >
                      {student.hours_remaining || 0}h
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={student.user?.email_confirmed_at ? "default" : "secondary"}
                    >
                      {student.user?.email_confirmed_at ? "Active" : "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => router.push(`/admin/students/${student.id}/edit`)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            bulkSelection.selectItem(student);
                            bulkConfirmation.confirm(handleBulkDelete);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredStudents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    {searchTerm ? "No students found matching your search." : "No students found."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Bulk Confirmation Dialog */}
      <BulkConfirmationDialog
        isOpen={bulkConfirmation.isOpen}
        onClose={bulkConfirmation.handleCancel}
        onConfirm={bulkConfirmation.handleConfirm}
        action="delete"
        items={bulkSelection.selectedItems.map(student => ({
          id: student.id,
          displayName: student.user?.full_name || student.user?.email || student.id,
          warning: student.hours_remaining > 0 ? `Student has ${student.hours_remaining} hours remaining` : undefined,
        }))}
      />

      {/* Bulk Progress Dialog */}
      <BulkProgressDialog
        isOpen={bulkProgress.progress.status === "running" || bulkProgress.progress.status === "completed"}
        onClose={bulkProgress.resetProgress}
        progress={bulkProgress.progress}
        operation="Bulk Student Operation"
      />
    </div>
  );
}