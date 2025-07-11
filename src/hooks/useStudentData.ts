import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentService, type Student, type CreateStudentData } from '@/lib/services/student-service';
import { toast } from 'sonner';

export interface StudentFilters {
  search?: string;
  testLevel?: string;
  courseType?: string;
  status?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface StudentSortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface StudentListOptions {
  page?: number;
  limit?: number;
  filters?: StudentFilters;
  sort?: StudentSortOptions;
}

export interface StudentStats {
  totalStudents: number;
  activeStudents: number;
  newStudentsThisMonth: number;
  averageHoursRemaining: number;
  completionRate: number;
  byTestLevel: Record<string, number>;
  byCourseType: Record<string, number>;
  byStatus: Record<string, number>;
}

export interface UseStudentDataReturn {
  // Student list
  students: Student[];
  loading: boolean;
  error: Error | null;
  
  // Pagination
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  
  // Filters and sorting
  filters: StudentFilters;
  sortOptions: StudentSortOptions;
  
  // Actions
  fetchStudents: (options?: StudentListOptions) => Promise<void>;
  refreshStudents: () => Promise<void>;
  createStudent: (data: CreateStudentData) => Promise<{ success: boolean; error?: string }>;
  updateStudent: (id: string, data: Partial<CreateStudentData>) => Promise<{ success: boolean; error?: string }>;
  deleteStudent: (id: string) => Promise<{ success: boolean; error?: string }>;
  bulkDeleteStudents: (ids: string[]) => Promise<{ success: boolean; error?: string }>;
  
  // Individual student
  getStudent: (id: string) => Promise<Student | null>;
  getStudentStats: () => Promise<StudentStats>;
  
  // Filters and sorting
  setFilters: (filters: StudentFilters) => void;
  setSortOptions: (sort: StudentSortOptions) => void;
  clearFilters: () => void;
  
  // Navigation
  goToPage: (page: number) => void;
  goToNextPage: () => void;
  goToPrevPage: () => void;
  
  // Hour management
  updateStudentHours: (id: string, hoursToDeduct: number) => Promise<{ success: boolean; error?: string }>;
  
  // Bulk operations
  bulkUpdateStudents: (updates: Array<{ id: string; data: Partial<CreateStudentData> }>) => Promise<{ success: boolean; error?: string }>;
  exportStudents: (format: 'csv' | 'excel') => Promise<{ success: boolean; url?: string; error?: string }>;
  
  // Search and filter helpers
  searchStudents: (query: string) => Promise<Student[]>;
  getStudentsByTestLevel: (testLevel: string) => Promise<Student[]>;
  getStudentsByCourseType: (courseType: string) => Promise<Student[]>;
}

const QUERY_KEY = 'students';
const DEFAULT_LIMIT = 10;

export const useStudentData = (initialOptions?: StudentListOptions): UseStudentDataReturn => {
  const queryClient = useQueryClient();
  
  // State
  const [currentPage, setCurrentPage] = useState(initialOptions?.page || 1);
  const [filters, setFiltersState] = useState<StudentFilters>(initialOptions?.filters || {});
  const [sortOptions, setSortOptionsState] = useState<StudentSortOptions>(
    initialOptions?.sort || { field: 'created_at', direction: 'desc' }
  );
  
  const limit = initialOptions?.limit || DEFAULT_LIMIT;

  // Query for students list
  const {
    data: studentsData,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, 'list', currentPage, limit, filters, sortOptions],
    queryFn: async () => {
      const queryFilters = [];
      
      // Apply filters
      if (filters.search) {
        queryFilters.push({ column: 'full_name', operator: 'ilike', value: `%${filters.search}%` });
      }
      if (filters.testLevel) {
        queryFilters.push({ column: 'test_level', operator: 'eq', value: filters.testLevel });
      }
      if (filters.courseType) {
        queryFilters.push({ column: 'course_type', operator: 'eq', value: filters.courseType });
      }
      if (filters.status) {
        queryFilters.push({ column: 'status', operator: 'eq', value: filters.status });
      }
      if (filters.dateRange) {
        queryFilters.push(
          { column: 'created_at', operator: 'gte', value: filters.dateRange.start },
          { column: 'created_at', operator: 'lte', value: filters.dateRange.end }
        );
      }

      const result = await studentService.getAll({
        page: currentPage,
        limit,
        filters: queryFilters,
        orderBy: { column: sortOptions.field, ascending: sortOptions.direction === 'asc' },
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  // Mutations
  const createStudentMutation = useMutation({
    mutationFn: async (data: CreateStudentData) => {
      const result = await studentService.createStudent(data);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Student created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateStudentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateStudentData> }) => {
      const result = await studentService.updateStudent(id, data);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Student updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteStudentMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await studentService.delete(id);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Student deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateHoursMutation = useMutation({
    mutationFn: async ({ id, hoursToDeduct }: { id: string; hoursToDeduct: number }) => {
      const result = await studentService.updateStudentHours(id, hoursToDeduct);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Student hours updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Actions
  const fetchStudents = useCallback(async (options?: StudentListOptions) => {
    if (options?.page) setCurrentPage(options.page);
    if (options?.filters) setFiltersState(options.filters);
    if (options?.sort) setSortOptionsState(options.sort);
    
    // Trigger refetch
    await refetch();
  }, [refetch]);

  const refreshStudents = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const createStudent = useCallback(async (data: CreateStudentData) => {
    try {
      await createStudentMutation.mutateAsync(data);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, [createStudentMutation]);

  const updateStudent = useCallback(async (id: string, data: Partial<CreateStudentData>) => {
    try {
      await updateStudentMutation.mutateAsync({ id, data });
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, [updateStudentMutation]);

  const deleteStudent = useCallback(async (id: string) => {
    try {
      await deleteStudentMutation.mutateAsync(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, [deleteStudentMutation]);

  const bulkDeleteStudents = useCallback(async (ids: string[]) => {
    try {
      // Execute deletions in parallel
      const results = await Promise.allSettled(
        ids.map(id => deleteStudentMutation.mutateAsync(id))
      );

      const failures = results.filter(result => result.status === 'rejected');
      
      if (failures.length > 0) {
        return { 
          success: false, 
          error: `Failed to delete ${failures.length} out of ${ids.length} students` 
        };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, [deleteStudentMutation]);

  const getStudent = useCallback(async (id: string) => {
    try {
      const result = await studentService.getById(id);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data;
    } catch (error) {
      console.error('Error fetching student:', error);
      return null;
    }
  }, []);

  const getStudentStats = useCallback(async (): Promise<StudentStats> => {
    try {
      const allStudentsResult = await studentService.getAll({ limit: 1000 });
      
      if (allStudentsResult.error) {
        throw new Error(allStudentsResult.error.message);
      }

      const students = allStudentsResult.data?.items || [];
      
      const stats: StudentStats = {
        totalStudents: students.length,
        activeStudents: students.filter(s => s.status === 'active').length,
        newStudentsThisMonth: students.filter(s => {
          const created = new Date(s.created_at);
          const thisMonth = new Date();
          return created.getMonth() === thisMonth.getMonth() && 
                 created.getFullYear() === thisMonth.getFullYear();
        }).length,
        averageHoursRemaining: students.reduce((sum, s) => sum + (s.hours_remaining || 0), 0) / students.length,
        completionRate: 0, // Would need course completion data
        byTestLevel: {},
        byCourseType: {},
        byStatus: {}
      };

      // Calculate distributions
      students.forEach(student => {
        // By test level
        if (student.test_level) {
          stats.byTestLevel[student.test_level] = (stats.byTestLevel[student.test_level] || 0) + 1;
        }
        
        // By course type
        if (student.course_type) {
          stats.byCourseType[student.course_type] = (stats.byCourseType[student.course_type] || 0) + 1;
        }
        
        // By status
        const status = student.status || 'active';
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error calculating student stats:', error);
      return {
        totalStudents: 0,
        activeStudents: 0,
        newStudentsThisMonth: 0,
        averageHoursRemaining: 0,
        completionRate: 0,
        byTestLevel: {},
        byCourseType: {},
        byStatus: {}
      };
    }
  }, []);

  // Filter and sort actions
  const setFilters = useCallback((newFilters: StudentFilters) => {
    setFiltersState(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  }, []);

  const setSortOptions = useCallback((newSort: StudentSortOptions) => {
    setSortOptionsState(newSort);
    setCurrentPage(1); // Reset to first page when sort changes
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState({});
    setCurrentPage(1);
  }, []);

  // Navigation
  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const goToNextPage = useCallback(() => {
    if (studentsData?.hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  }, [studentsData?.hasNextPage]);

  const goToPrevPage = useCallback(() => {
    if (studentsData?.hasPrevPage) {
      setCurrentPage(prev => prev - 1);
    }
  }, [studentsData?.hasPrevPage]);

  // Hour management
  const updateStudentHours = useCallback(async (id: string, hoursToDeduct: number) => {
    try {
      await updateHoursMutation.mutateAsync({ id, hoursToDeduct });
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, [updateHoursMutation]);

  // Bulk operations
  const bulkUpdateStudents = useCallback(async (updates: Array<{ id: string; data: Partial<CreateStudentData> }>) => {
    try {
      const results = await Promise.allSettled(
        updates.map(update => updateStudentMutation.mutateAsync({ id: update.id, data: update.data }))
      );

      const failures = results.filter(result => result.status === 'rejected');
      
      if (failures.length > 0) {
        return { 
          success: false, 
          error: `Failed to update ${failures.length} out of ${updates.length} students` 
        };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, [updateStudentMutation]);

  const exportStudents = useCallback(async (format: 'csv' | 'excel') => {
    try {
      // Get all students for export
      const result = await studentService.getAll({ limit: 10000 });
      
      if (result.error) {
        throw new Error(result.error.message);
      }

      const students = result.data?.items || [];
      
      // Convert to CSV or Excel format
      let exportData: string;
      let filename: string;
      let mimeType: string;

      if (format === 'csv') {
        const headers = ['ID', 'Email', 'Full Name', 'Internal Code', 'Test Level', 'Course Type', 'Hours Remaining', 'Status', 'Created At'];
        const rows = students.map(student => [
          student.id,
          student.user?.email || '',
          student.user?.full_name || '',
          student.internal_code,
          student.test_level || '',
          student.course_type || '',
          student.hours_remaining || 0,
          student.status || 'active',
          new Date(student.created_at).toLocaleDateString()
        ]);
        
        exportData = [headers, ...rows].map(row => row.join(',')).join('\n');
        filename = `students-${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      } else {
        // For Excel, you'd typically use a library like xlsx
        // For now, we'll export as CSV with .xlsx extension
        const headers = ['ID', 'Email', 'Full Name', 'Internal Code', 'Test Level', 'Course Type', 'Hours Remaining', 'Status', 'Created At'];
        const rows = students.map(student => [
          student.id,
          student.user?.email || '',
          student.user?.full_name || '',
          student.internal_code,
          student.test_level || '',
          student.course_type || '',
          student.hours_remaining || 0,
          student.status || 'active',
          new Date(student.created_at).toLocaleDateString()
        ]);
        
        exportData = [headers, ...rows].map(row => row.join(',')).join('\n');
        filename = `students-${new Date().toISOString().split('T')[0]}.xlsx`;
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      }

      // Create blob and download
      const blob = new Blob([exportData], { type: mimeType });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return { success: true, url };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, []);

  // Search and filter helpers
  const searchStudents = useCallback(async (query: string) => {
    try {
      const result = await studentService.getAll({
        filters: [
          { column: 'full_name', operator: 'ilike', value: `%${query}%` }
        ],
        limit: 50
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      return result.data?.items || [];
    } catch (error) {
      console.error('Error searching students:', error);
      return [];
    }
  }, []);

  const getStudentsByTestLevel = useCallback(async (testLevel: string) => {
    try {
      const result = await studentService.getStudentsByTestLevel(testLevel);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data?.items || [];
    } catch (error) {
      console.error('Error fetching students by test level:', error);
      return [];
    }
  }, []);

  const getStudentsByCourseType = useCallback(async (courseType: string) => {
    try {
      const result = await studentService.getStudentsByCourseType(courseType);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data?.items || [];
    } catch (error) {
      console.error('Error fetching students by course type:', error);
      return [];
    }
  }, []);

  return {
    // Student list
    students: studentsData?.items || [],
    loading,
    error: error as Error | null,
    
    // Pagination
    currentPage,
    totalPages: studentsData?.totalPages || 1,
    totalCount: studentsData?.totalCount || 0,
    hasNextPage: studentsData?.hasNextPage || false,
    hasPrevPage: studentsData?.hasPrevPage || false,
    
    // Filters and sorting
    filters,
    sortOptions,
    
    // Actions
    fetchStudents,
    refreshStudents,
    createStudent,
    updateStudent,
    deleteStudent,
    bulkDeleteStudents,
    
    // Individual student
    getStudent,
    getStudentStats,
    
    // Filters and sorting
    setFilters,
    setSortOptions,
    clearFilters,
    
    // Navigation
    goToPage,
    goToNextPage,
    goToPrevPage,
    
    // Hour management
    updateStudentHours,
    
    // Bulk operations
    bulkUpdateStudents,
    exportStudents,
    
    // Search and filter helpers
    searchStudents,
    getStudentsByTestLevel,
    getStudentsByCourseType,
  };
};