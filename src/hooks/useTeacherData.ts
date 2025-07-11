import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CRUDService } from '@/lib/services/crud-service';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface Teacher {
  id: string;
  user_id: string;
  internal_code: string;
  specialization?: string;
  hourly_rate?: number;
  max_hours_per_week?: number;
  preferred_class_types?: string[];
  experience_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  bio?: string;
  certifications?: string[];
  languages_spoken?: string[];
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    avatar_url?: string;
  };
}

export interface CreateTeacherData {
  email: string;
  full_name: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  internal_code: string;
  specialization?: string;
  hourly_rate?: number;
  max_hours_per_week?: number;
  preferred_class_types?: string[];
  experience_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  bio?: string;
  certifications?: string[];
  languages_spoken?: string[];
  avatar_url?: string;
}

export interface TeacherFilters {
  search?: string;
  specialization?: string;
  experienceLevel?: string;
  status?: string;
  hourlyRateMin?: number;
  hourlyRateMax?: number;
  classTypes?: string[];
  languages?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface TeacherSortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface TeacherListOptions {
  page?: number;
  limit?: number;
  filters?: TeacherFilters;
  sort?: TeacherSortOptions;
}

export interface TeacherStats {
  totalTeachers: number;
  activeTeachers: number;
  newTeachersThisMonth: number;
  averageHourlyRate: number;
  averageHoursPerWeek: number;
  bySpecialization: Record<string, number>;
  byExperienceLevel: Record<string, number>;
  byStatus: Record<string, number>;
  topRatedTeachers: Array<{
    id: string;
    name: string;
    rating: number;
    totalClasses: number;
  }>;
}

export interface TeacherAvailability {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  max_students?: number;
  class_types?: string[];
}

export interface TeacherPerformance {
  teacherId: string;
  totalClassesThisMonth: number;
  averageRating: number;
  completionRate: number;
  cancellationRate: number;
  studentFeedback: Array<{
    studentId: string;
    rating: number;
    comment: string;
    date: string;
  }>;
  hoursThisMonth: number;
  earningsThisMonth: number;
}

export interface UseTeacherDataReturn {
  // Teacher list
  teachers: Teacher[];
  loading: boolean;
  error: Error | null;
  
  // Pagination
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  
  // Filters and sorting
  filters: TeacherFilters;
  sortOptions: TeacherSortOptions;
  
  // Actions
  fetchTeachers: (options?: TeacherListOptions) => Promise<void>;
  refreshTeachers: () => Promise<void>;
  createTeacher: (data: CreateTeacherData) => Promise<{ success: boolean; error?: string }>;
  updateTeacher: (id: string, data: Partial<CreateTeacherData>) => Promise<{ success: boolean; error?: string }>;
  deleteTeacher: (id: string) => Promise<{ success: boolean; error?: string }>;
  bulkDeleteTeachers: (ids: string[]) => Promise<{ success: boolean; error?: string }>;
  
  // Individual teacher
  getTeacher: (id: string) => Promise<Teacher | null>;
  getTeacherStats: () => Promise<TeacherStats>;
  getTeacherPerformance: (id: string, periodDays?: number) => Promise<TeacherPerformance | null>;
  
  // Filters and sorting
  setFilters: (filters: TeacherFilters) => void;
  setSortOptions: (sort: TeacherSortOptions) => void;
  clearFilters: () => void;
  
  // Navigation
  goToPage: (page: number) => void;
  goToNextPage: () => void;
  goToPrevPage: () => void;
  
  // Availability management
  getTeacherAvailability: (id: string) => Promise<TeacherAvailability[]>;
  updateTeacherAvailability: (id: string, availability: TeacherAvailability[]) => Promise<{ success: boolean; error?: string }>;
  
  // Assignment management
  assignTeacherToClass: (teacherId: string, classId: string) => Promise<{ success: boolean; error?: string }>;
  unassignTeacherFromClass: (teacherId: string, classId: string) => Promise<{ success: boolean; error?: string }>;
  
  // Bulk operations
  bulkUpdateTeachers: (updates: Array<{ id: string; data: Partial<CreateTeacherData> }>) => Promise<{ success: boolean; error?: string }>;
  exportTeachers: (format: 'csv' | 'excel') => Promise<{ success: boolean; url?: string; error?: string }>;
  
  // Search and filter helpers
  searchTeachers: (query: string) => Promise<Teacher[]>;
  getTeachersBySpecialization: (specialization: string) => Promise<Teacher[]>;
  getAvailableTeachers: (dateTime: string, duration: number) => Promise<Teacher[]>;
}

const QUERY_KEY = 'teachers';
const DEFAULT_LIMIT = 10;

// Create teacher service instance
const teacherService = new CRUDService<Teacher>({
  table: 'teachers',
  select: `
    *,
    user:users(
      id,
      email,
      full_name,
      role,
      first_name,
      last_name,
      phone,
      avatar_url,
      created_at
    )
  `,
  cache: {
    enabled: true,
    ttl: 5 * 60 * 1000, // 5 minutes
  },
});

export const useTeacherData = (initialOptions?: TeacherListOptions): UseTeacherDataReturn => {
  const queryClient = useQueryClient();
  
  // State
  const [currentPage, setCurrentPage] = useState(initialOptions?.page || 1);
  const [filters, setFiltersState] = useState<TeacherFilters>(initialOptions?.filters || {});
  const [sortOptions, setSortOptionsState] = useState<TeacherSortOptions>(
    initialOptions?.sort || { field: 'created_at', direction: 'desc' }
  );
  
  const limit = initialOptions?.limit || DEFAULT_LIMIT;

  // Query for teachers list
  const {
    data: teachersData,
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
      if (filters.specialization) {
        queryFilters.push({ column: 'specialization', operator: 'eq', value: filters.specialization });
      }
      if (filters.experienceLevel) {
        queryFilters.push({ column: 'experience_level', operator: 'eq', value: filters.experienceLevel });
      }
      if (filters.status) {
        queryFilters.push({ column: 'status', operator: 'eq', value: filters.status });
      }
      if (filters.hourlyRateMin !== undefined) {
        queryFilters.push({ column: 'hourly_rate', operator: 'gte', value: filters.hourlyRateMin });
      }
      if (filters.hourlyRateMax !== undefined) {
        queryFilters.push({ column: 'hourly_rate', operator: 'lte', value: filters.hourlyRateMax });
      }
      if (filters.dateRange) {
        queryFilters.push(
          { column: 'created_at', operator: 'gte', value: filters.dateRange.start },
          { column: 'created_at', operator: 'lte', value: filters.dateRange.end }
        );
      }

      const result = await teacherService.getAll({
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
  const createTeacherMutation = useMutation({
    mutationFn: async (data: CreateTeacherData) => {
      // Create user first
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          email: data.email,
          full_name: data.full_name,
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone,
          role: 'teacher',
          avatar_url: data.avatar_url,
          password_hash: await hashPassword(data.password),
        })
        .select()
        .single();

      if (userError) {
        throw new Error(`Failed to create user: ${userError.message}`);
      }

      // Create teacher record
      const { data: newTeacher, error: teacherError } = await supabase
        .from('teachers')
        .insert({
          user_id: newUser.id,
          internal_code: data.internal_code,
          specialization: data.specialization,
          hourly_rate: data.hourly_rate,
          max_hours_per_week: data.max_hours_per_week,
          preferred_class_types: data.preferred_class_types,
          experience_level: data.experience_level,
          bio: data.bio,
          certifications: data.certifications,
          languages_spoken: data.languages_spoken,
          status: 'active',
        })
        .select(`
          *,
          user:users(
            id,
            email,
            full_name,
            role,
            first_name,
            last_name,
            phone,
            avatar_url,
            created_at
          )
        `)
        .single();

      if (teacherError) {
        throw new Error(`Failed to create teacher: ${teacherError.message}`);
      }

      return newTeacher;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Teacher created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateTeacherMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateTeacherData> }) => {
      // Separate user and teacher fields
      const userUpdates: any = {};
      const teacherUpdates: any = {};

      if (data.email) userUpdates.email = data.email;
      if (data.full_name) userUpdates.full_name = data.full_name;
      if (data.first_name) userUpdates.first_name = data.first_name;
      if (data.last_name) userUpdates.last_name = data.last_name;
      if (data.phone) userUpdates.phone = data.phone;
      if (data.avatar_url) userUpdates.avatar_url = data.avatar_url;
      if (data.password) userUpdates.password_hash = await hashPassword(data.password);

      if (data.internal_code) teacherUpdates.internal_code = data.internal_code;
      if (data.specialization) teacherUpdates.specialization = data.specialization;
      if (data.hourly_rate !== undefined) teacherUpdates.hourly_rate = data.hourly_rate;
      if (data.max_hours_per_week !== undefined) teacherUpdates.max_hours_per_week = data.max_hours_per_week;
      if (data.preferred_class_types) teacherUpdates.preferred_class_types = data.preferred_class_types;
      if (data.experience_level) teacherUpdates.experience_level = data.experience_level;
      if (data.bio) teacherUpdates.bio = data.bio;
      if (data.certifications) teacherUpdates.certifications = data.certifications;
      if (data.languages_spoken) teacherUpdates.languages_spoken = data.languages_spoken;

      // Update teacher record
      if (Object.keys(teacherUpdates).length > 0) {
        const { error } = await supabase
          .from('teachers')
          .update(teacherUpdates)
          .eq('id', id);

        if (error) throw error;
      }

      // Update user record if needed
      if (Object.keys(userUpdates).length > 0) {
        const { data: teacher } = await supabase
          .from('teachers')
          .select('user_id')
          .eq('id', id)
          .single();

        if (teacher?.user_id) {
          const { error } = await supabase
            .from('users')
            .update(userUpdates)
            .eq('id', teacher.user_id);

          if (error) throw error;
        }
      }

      return { id, ...teacherUpdates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Teacher updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteTeacherMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await teacherService.delete(id);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Teacher deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Hash password helper
  const hashPassword = async (password: string): Promise<string> => {
    const bcrypt = await import('bcryptjs');
    return bcrypt.hash(password, 10);
  };

  // Actions
  const fetchTeachers = useCallback(async (options?: TeacherListOptions) => {
    if (options?.page) setCurrentPage(options.page);
    if (options?.filters) setFiltersState(options.filters);
    if (options?.sort) setSortOptionsState(options.sort);
    
    await refetch();
  }, [refetch]);

  const refreshTeachers = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const createTeacher = useCallback(async (data: CreateTeacherData) => {
    try {
      await createTeacherMutation.mutateAsync(data);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, [createTeacherMutation]);

  const updateTeacher = useCallback(async (id: string, data: Partial<CreateTeacherData>) => {
    try {
      await updateTeacherMutation.mutateAsync({ id, data });
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, [updateTeacherMutation]);

  const deleteTeacher = useCallback(async (id: string) => {
    try {
      await deleteTeacherMutation.mutateAsync(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, [deleteTeacherMutation]);

  const bulkDeleteTeachers = useCallback(async (ids: string[]) => {
    try {
      const results = await Promise.allSettled(
        ids.map(id => deleteTeacherMutation.mutateAsync(id))
      );

      const failures = results.filter(result => result.status === 'rejected');
      
      if (failures.length > 0) {
        return { 
          success: false, 
          error: `Failed to delete ${failures.length} out of ${ids.length} teachers` 
        };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, [deleteTeacherMutation]);

  const getTeacher = useCallback(async (id: string) => {
    try {
      const result = await teacherService.getById(id);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data;
    } catch (error) {
      console.error('Error fetching teacher:', error);
      return null;
    }
  }, []);

  const getTeacherStats = useCallback(async (): Promise<TeacherStats> => {
    try {
      const allTeachersResult = await teacherService.getAll({ limit: 1000 });
      
      if (allTeachersResult.error) {
        throw new Error(allTeachersResult.error.message);
      }

      const teachers = allTeachersResult.data?.items || [];
      
      const stats: TeacherStats = {
        totalTeachers: teachers.length,
        activeTeachers: teachers.filter(t => t.status === 'active').length,
        newTeachersThisMonth: teachers.filter(t => {
          const created = new Date(t.created_at);
          const thisMonth = new Date();
          return created.getMonth() === thisMonth.getMonth() && 
                 created.getFullYear() === thisMonth.getFullYear();
        }).length,
        averageHourlyRate: teachers.reduce((sum, t) => sum + (t.hourly_rate || 0), 0) / teachers.length,
        averageHoursPerWeek: teachers.reduce((sum, t) => sum + (t.max_hours_per_week || 0), 0) / teachers.length,
        bySpecialization: {},
        byExperienceLevel: {},
        byStatus: {},
        topRatedTeachers: [] // Would need rating data
      };

      // Calculate distributions
      teachers.forEach(teacher => {
        if (teacher.specialization) {
          stats.bySpecialization[teacher.specialization] = (stats.bySpecialization[teacher.specialization] || 0) + 1;
        }
        
        if (teacher.experience_level) {
          stats.byExperienceLevel[teacher.experience_level] = (stats.byExperienceLevel[teacher.experience_level] || 0) + 1;
        }
        
        stats.byStatus[teacher.status] = (stats.byStatus[teacher.status] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error calculating teacher stats:', error);
      return {
        totalTeachers: 0,
        activeTeachers: 0,
        newTeachersThisMonth: 0,
        averageHourlyRate: 0,
        averageHoursPerWeek: 0,
        bySpecialization: {},
        byExperienceLevel: {},
        byStatus: {},
        topRatedTeachers: []
      };
    }
  }, []);

  const getTeacherPerformance = useCallback(async (id: string, periodDays: number = 30): Promise<TeacherPerformance | null> => {
    try {
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - periodDays);

      // Get class data
      const { data: classData, error: classError } = await supabase
        .from('class_schedules')
        .select('*')
        .eq('teacher_id', id)
        .gte('start_time', periodStart.toISOString());

      if (classError) throw classError;

      // Get ratings
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('teacher_ratings')
        .select('*')
        .eq('teacher_id', id)
        .gte('created_at', periodStart.toISOString());

      if (ratingsError) throw ratingsError;

      const classes = classData || [];
      const ratings = ratingsData || [];

      const performance: TeacherPerformance = {
        teacherId: id,
        totalClassesThisMonth: classes.length,
        averageRating: ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : 0,
        completionRate: classes.length > 0 ? (classes.filter(c => c.status === 'completed').length / classes.length) * 100 : 0,
        cancellationRate: classes.length > 0 ? (classes.filter(c => c.status === 'cancelled').length / classes.length) * 100 : 0,
        studentFeedback: ratings.map(r => ({
          studentId: r.student_id,
          rating: r.rating,
          comment: r.comment || '',
          date: r.created_at
        })),
        hoursThisMonth: classes.reduce((sum, c) => sum + (c.duration || 60), 0) / 60,
        earningsThisMonth: 0 // Would need to calculate based on hourly rate
      };

      return performance;
    } catch (error) {
      console.error('Error fetching teacher performance:', error);
      return null;
    }
  }, []);

  // Filter and sort actions
  const setFilters = useCallback((newFilters: TeacherFilters) => {
    setFiltersState(newFilters);
    setCurrentPage(1);
  }, []);

  const setSortOptions = useCallback((newSort: TeacherSortOptions) => {
    setSortOptionsState(newSort);
    setCurrentPage(1);
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
    if (teachersData?.hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  }, [teachersData?.hasNextPage]);

  const goToPrevPage = useCallback(() => {
    if (teachersData?.hasPrevPage) {
      setCurrentPage(prev => prev - 1);
    }
  }, [teachersData?.hasPrevPage]);

  // Availability management
  const getTeacherAvailability = useCallback(async (id: string): Promise<TeacherAvailability[]> => {
    try {
      const { data, error } = await supabase
        .from('teacher_availability')
        .select('*')
        .eq('teacher_id', id)
        .order('day_of_week', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching teacher availability:', error);
      return [];
    }
  }, []);

  const updateTeacherAvailability = useCallback(async (id: string, availability: TeacherAvailability[]) => {
    try {
      // Delete existing availability
      const { error: deleteError } = await supabase
        .from('teacher_availability')
        .delete()
        .eq('teacher_id', id);

      if (deleteError) throw deleteError;

      // Insert new availability
      const { error: insertError } = await supabase
        .from('teacher_availability')
        .insert(
          availability.map(avail => ({
            teacher_id: id,
            ...avail
          }))
        );

      if (insertError) throw insertError;

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, []);

  // Assignment management
  const assignTeacherToClass = useCallback(async (teacherId: string, classId: string) => {
    try {
      const { error } = await supabase
        .from('class_schedules')
        .update({ teacher_id: teacherId })
        .eq('id', classId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, []);

  const unassignTeacherFromClass = useCallback(async (teacherId: string, classId: string) => {
    try {
      const { error } = await supabase
        .from('class_schedules')
        .update({ teacher_id: null })
        .eq('id', classId)
        .eq('teacher_id', teacherId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, []);

  // Bulk operations
  const bulkUpdateTeachers = useCallback(async (updates: Array<{ id: string; data: Partial<CreateTeacherData> }>) => {
    try {
      const results = await Promise.allSettled(
        updates.map(update => updateTeacherMutation.mutateAsync({ id: update.id, data: update.data }))
      );

      const failures = results.filter(result => result.status === 'rejected');
      
      if (failures.length > 0) {
        return { 
          success: false, 
          error: `Failed to update ${failures.length} out of ${updates.length} teachers` 
        };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, [updateTeacherMutation]);

  const exportTeachers = useCallback(async (format: 'csv' | 'excel') => {
    try {
      const result = await teacherService.getAll({ limit: 10000 });
      
      if (result.error) {
        throw new Error(result.error.message);
      }

      const teachers = result.data?.items || [];
      
      const headers = ['ID', 'Email', 'Full Name', 'Internal Code', 'Specialization', 'Experience Level', 'Hourly Rate', 'Status', 'Created At'];
      const rows = teachers.map(teacher => [
        teacher.id,
        teacher.user?.email || '',
        teacher.user?.full_name || '',
        teacher.internal_code,
        teacher.specialization || '',
        teacher.experience_level || '',
        teacher.hourly_rate || 0,
        teacher.status,
        new Date(teacher.created_at).toLocaleDateString()
      ]);
      
      const exportData = [headers, ...rows].map(row => row.join(',')).join('\n');
      const filename = `teachers-${new Date().toISOString().split('T')[0]}.${format}`;
      const mimeType = format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

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
  const searchTeachers = useCallback(async (query: string) => {
    try {
      const result = await teacherService.getAll({
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
      console.error('Error searching teachers:', error);
      return [];
    }
  }, []);

  const getTeachersBySpecialization = useCallback(async (specialization: string) => {
    try {
      const result = await teacherService.getAll({
        filters: [
          { column: 'specialization', operator: 'eq', value: specialization }
        ],
        limit: 100
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      return result.data?.items || [];
    } catch (error) {
      console.error('Error fetching teachers by specialization:', error);
      return [];
    }
  }, []);

  const getAvailableTeachers = useCallback(async (dateTime: string, duration: number) => {
    try {
      // This would need complex logic to check availability
      // For now, return all active teachers
      const result = await teacherService.getAll({
        filters: [
          { column: 'status', operator: 'eq', value: 'active' }
        ],
        limit: 100
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      return result.data?.items || [];
    } catch (error) {
      console.error('Error fetching available teachers:', error);
      return [];
    }
  }, []);

  return {
    // Teacher list
    teachers: teachersData?.items || [],
    loading,
    error: error as Error | null,
    
    // Pagination
    currentPage,
    totalPages: teachersData?.totalPages || 1,
    totalCount: teachersData?.totalCount || 0,
    hasNextPage: teachersData?.hasNextPage || false,
    hasPrevPage: teachersData?.hasPrevPage || false,
    
    // Filters and sorting
    filters,
    sortOptions,
    
    // Actions
    fetchTeachers,
    refreshTeachers,
    createTeacher,
    updateTeacher,
    deleteTeacher,
    bulkDeleteTeachers,
    
    // Individual teacher
    getTeacher,
    getTeacherStats,
    getTeacherPerformance,
    
    // Filters and sorting
    setFilters,
    setSortOptions,
    clearFilters,
    
    // Navigation
    goToPage,
    goToNextPage,
    goToPrevPage,
    
    // Availability management
    getTeacherAvailability,
    updateTeacherAvailability,
    
    // Assignment management
    assignTeacherToClass,
    unassignTeacherFromClass,
    
    // Bulk operations
    bulkUpdateTeachers,
    exportTeachers,
    
    // Search and filter helpers
    searchTeachers,
    getTeachersBySpecialization,
    getAvailableTeachers,
  };
};