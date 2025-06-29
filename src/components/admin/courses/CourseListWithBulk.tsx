"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2, Download, Copy, ToggleLeft, ToggleRight } from "lucide-react";

import { courseService, type Course } from "@/lib/services/course-service";
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

interface CourseListWithBulkProps {
  initialCourses: Course[];
}

export function CourseListWithBulk({ initialCourses }: CourseListWithBulkProps) {
  const router = useRouter();
  const [courses, setCourses] = React.useState<Course[]>(initialCourses);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  // Bulk selection
  const bulkSelection = useBulkSelection({
    items: courses,
    keyExtractor: (course) => course.id,
  });

  // Bulk progress
  const bulkProgress = useBulkProgress();

  // Bulk confirmation
  const bulkConfirmation = useBulkConfirmation();

  // Filter courses based on search
  const filteredCourses = React.useMemo(() => {
    if (!searchTerm) return courses;
    
    return courses.filter(course =>
      course.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.course_type?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [courses, searchTerm]);

  // Refresh courses list
  const refreshCourses = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await courseService.getAll();
      if (result.data) {
        setCourses(result.data);
      }
    } catch (error) {
      toast.error("Failed to refresh courses list");
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

    for (const course of selectedItems) {
      try {
        bulkProgress.updateProgress(completed, failed, `Deleting ${course.title || course.id}`);
        
        const result = await courseService.delete(course.id);
        if (result.error) {
          failed++;
          bulkProgress.addError(`Failed to delete ${course.title || course.id}: ${result.error.message}`);
        }
        completed++;
      } catch (error) {
        failed++;
        bulkProgress.addError(`Failed to delete ${course.title || course.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        completed++;
      }
    }

    bulkProgress.completeOperation();
    bulkSelection.clearSelection();
    
    // Refresh the list
    await refreshCourses();
    
    const successCount = completed - failed;
    if (successCount > 0) {
      toast.success(`Successfully deleted ${successCount} course${successCount !== 1 ? 's' : ''}`);
    }
    if (failed > 0) {
      toast.error(`Failed to delete ${failed} course${failed !== 1 ? 's' : ''}`);
    }
  }, [bulkSelection.selectedItems, bulkProgress, bulkSelection, refreshCourses]);

  // Bulk export operation
  const handleBulkExport = React.useCallback(async () => {
    const selectedItems = bulkSelection.selectedItems;
    if (selectedItems.length === 0) return;

    bulkProgress.startOperation(selectedItems.length);
    
    try {
      // Create CSV content
      const headers = [
        "ID", "Title", "Description", "Course Type", "Delivery Mode", 
        "Duration Hours", "Max Students", "Price", "Active", "Created At"
      ];
      
      const csvContent = [
        headers.join(","),
        ...selectedItems.map(course => [
          course.id,
          `"${course.title || ''}"`,
          `"${(course.description || '').replace(/"/g, '""')}"`,
          `"${course.course_type || ''}"`,
          `"${course.delivery_mode || ''}"`,
          course.duration_hours || 0,
          course.max_students || 0,
          course.price || 0,
          course.is_active ? "Yes" : "No",
          `"${course.created_at || ''}"`
        ].join(","))
      ].join("\n");

      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `courses-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      bulkProgress.updateProgress(selectedItems.length, 0);
      bulkProgress.completeOperation();
      
      toast.success(`Exported ${selectedItems.length} course${selectedItems.length !== 1 ? 's' : ''}`);
    } catch (error) {
      bulkProgress.addError(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      bulkProgress.completeOperation();
      toast.error("Export failed");
    }
  }, [bulkSelection.selectedItems, bulkProgress]);

  // Bulk toggle status operation
  const handleBulkToggleStatus = React.useCallback(async () => {
    const selectedItems = bulkSelection.selectedItems;
    if (selectedItems.length === 0) return;

    bulkProgress.startOperation(selectedItems.length);
    
    let completed = 0;
    let failed = 0;

    for (const course of selectedItems) {
      try {
        bulkProgress.updateProgress(completed, failed, `Toggling status for ${course.title || course.id}`);
        
        const result = await courseService.toggleCourseStatus(course.id);
        if (result.error) {
          failed++;
          bulkProgress.addError(`Failed to toggle status for ${course.title || course.id}: ${result.error.message}`);
        }
        completed++;
      } catch (error) {
        failed++;
        bulkProgress.addError(`Failed to toggle status for ${course.title || course.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        completed++;
      }
    }

    bulkProgress.completeOperation();
    bulkSelection.clearSelection();
    
    // Refresh the list
    await refreshCourses();
    
    const successCount = completed - failed;
    if (successCount > 0) {
      toast.success(`Successfully updated ${successCount} course${successCount !== 1 ? 's' : ''}`);
    }
    if (failed > 0) {
      toast.error(`Failed to update ${failed} course${failed !== 1 ? 's' : ''}`);
    }
  }, [bulkSelection.selectedItems, bulkProgress, bulkSelection, refreshCourses]);

  // Bulk actions configuration
  const bulkActions = [
    commonBulkActions.delete(() => {
      bulkConfirmation.confirm(handleBulkDelete);
    }),
    commonBulkActions.export(handleBulkExport),
    {
      id: "toggle-status",
      label: "Toggle Status",
      icon: ToggleLeft,
      variant: "outline" as const,
      onClick: () => {
        bulkConfirmation.confirm(handleBulkToggleStatus);
      },
    },
  ];

  // Single course duplicate operation
  const handleDuplicateCourse = React.useCallback(async (course: Course) => {
    try {
      const newTitle = `${course.title} (Copy)`;
      const result = await courseService.duplicateCourse(course.id, newTitle);
      
      if (result.error) {
        toast.error(`Failed to duplicate course: ${result.error.message}`);
      } else {
        toast.success("Course duplicated successfully");
        await refreshCourses();
      }
    } catch (error) {
      toast.error("Failed to duplicate course");
    }
  }, [refreshCourses]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
          <p className="text-muted-foreground">
            Manage course catalog and enrollment options
          </p>
        </div>
        <Button onClick={() => router.push("/admin/courses/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Add Course
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
          <CardDescription>
            Find courses by title, description, or type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search courses..."
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

      {/* Courses Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Courses ({filteredCourses.length})
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
                    aria-label="Select all courses"
                  />
                </TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Max Students</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCourses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell>
                    <Checkbox
                      checked={bulkSelection.isSelected(course)}
                      onCheckedChange={() => bulkSelection.toggleItem(course)}
                      aria-label={`Select ${course.title}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium">
                        {course.title || "Untitled Course"}
                      </p>
                      {course.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {course.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {course.course_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={course.delivery_mode === "Online" ? "default" : "secondary"}>
                      {course.delivery_mode}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {course.duration_hours}h
                  </TableCell>
                  <TableCell>
                    {course.max_students} students
                  </TableCell>
                  <TableCell>
                    ${course.price || 0}
                  </TableCell>
                  <TableCell>
                    <Badge variant={course.is_active ? "default" : "secondary"}>
                      {course.is_active ? "Active" : "Inactive"}
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
                          onClick={() => router.push(`/admin/courses/${course.id}/edit`)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDuplicateCourse(course)}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={async () => {
                            try {
                              await courseService.toggleCourseStatus(course.id);
                              toast.success(`Course ${course.is_active ? 'deactivated' : 'activated'}`);
                              await refreshCourses();
                            } catch (error) {
                              toast.error("Failed to toggle course status");
                            }
                          }}
                        >
                          {course.is_active ? (
                            <>
                              <ToggleLeft className="mr-2 h-4 w-4" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <ToggleRight className="mr-2 h-4 w-4" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            bulkSelection.selectItem(course);
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
              {filteredCourses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    {searchTerm ? "No courses found matching your search." : "No courses found."}
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
        items={bulkSelection.selectedItems.map(course => ({
          id: course.id,
          displayName: course.title || course.id,
          warning: course.is_active ? "This course is currently active" : undefined,
        }))}
      />

      {/* Bulk Progress Dialog */}
      <BulkProgressDialog
        isOpen={bulkProgress.progress.status === "running" || bulkProgress.progress.status === "completed"}
        onClose={bulkProgress.resetProgress}
        progress={bulkProgress.progress}
        operation="Bulk Course Operation"
      />
    </div>
  );
}