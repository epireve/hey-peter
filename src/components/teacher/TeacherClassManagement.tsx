import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Edit, MoreVertical, Calendar, Users, BookOpen, Clock, Search, Filter, Copy, X, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

// Types
interface Class {
  id: string;
  teacher_id: string;
  name: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  capacity: number;
  enrolled_count?: number;
  status: 'active' | 'paused' | 'cancelled';
  type: 'group' | 'one-on-one';
  is_online: boolean;
  materials: string;
  requirements: string;
  created_at: string;
  updated_at: string;
}

interface ClassSchedule {
  id: string;
  class_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  effective_from: string;
  effective_until: string | null;
}

interface ClassEnrollment {
  id: string;
  class_id: string;
  student_id: string;
  enrolled_at: string;
  status: 'active' | 'cancelled';
  student: {
    id: string;
    full_name: string;
    email: string;
  };
}

// Validation schemas
const classFormSchema = z.object({
  name: z.string().min(1, 'Class name is required'),
  description: z.string().optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  capacity: z.number().min(1).max(9),
  type: z.enum(['group', 'one-on-one']),
  is_online: z.boolean(),
  materials: z.string().optional(),
  requirements: z.string().optional(),
});

const scheduleFormSchema = z.object({
  day_of_week: z.number().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  effective_from: z.string().optional(),
});

type ClassFormData = z.infer<typeof classFormSchema>;
type ScheduleFormData = z.infer<typeof scheduleFormSchema>;

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function TeacherClassManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [viewingClass, setViewingClass] = useState<Class | null>(null);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [cloningClass, setCloningClass] = useState<Class | null>(null);
  const [cloneName, setCloneName] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellingClass, setCancellingClass] = useState<Class | null>(null);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [reschedulingClass, setReschedulingClass] = useState<Class | null>(null);
  const [addScheduleDialogOpen, setAddScheduleDialogOpen] = useState(false);
  const [editMaterialsDialogOpen, setEditMaterialsDialogOpen] = useState(false);
  const [materials, setMaterials] = useState('');
  const [requirements, setRequirements] = useState('');
  const [removeStudentDialogOpen, setRemoveStudentDialogOpen] = useState(false);
  const [removingEnrollment, setRemovingEnrollment] = useState<ClassEnrollment | null>(null);
  const [deleteScheduleDialogOpen, setDeleteScheduleDialogOpen] = useState(false);
  const [deletingSchedule, setDeletingSchedule] = useState<ClassSchedule | null>(null);

  // Get current user
  const { data: userData } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user;
    },
  });

  // Fetch classes
  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['teacherClasses', userData?.id],
    queryFn: async () => {
      if (!userData?.id) return [];
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', userData.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Add enrolled count (mocked for now)
      return (data || []).map(cls => ({
        ...cls,
        enrolled_count: cls.id === '2' ? 9 : cls.id === '3' ? 4 : 5,
      }));
    },
    enabled: !!userData?.id,
  });

  // Fetch schedules for a class
  const { data: schedules = [] } = useQuery({
    queryKey: ['classSchedules', viewingClass?.id],
    queryFn: async () => {
      if (!viewingClass?.id) return [];
      const { data, error } = await supabase
        .from('class_schedules')
        .select('*')
        .eq('class_id', viewingClass.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!viewingClass?.id,
  });

  // Fetch enrollments for a class
  const { data: enrollments = [] } = useQuery({
    queryKey: ['classEnrollments', viewingClass?.id],
    queryFn: async () => {
      if (!viewingClass?.id) return [];
      const { data, error } = await supabase
        .from('class_enrollments')
        .select('*, student:students(*)')
        .eq('class_id', viewingClass.id)
        .eq('status', 'active');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!viewingClass?.id,
  });

  // Create class mutation
  const createClassMutation = useMutation({
    mutationFn: async (data: ClassFormData) => {
      const { data: newClass, error } = await supabase
        .from('classes')
        .insert({
          ...data,
          teacher_id: userData?.id,
          status: 'active',
          materials: data.materials || '',
          requirements: data.requirements || '',
        })
        .select()
        .single();
      
      if (error) throw error;
      return newClass;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacherClasses'] });
      setCreateDialogOpen(false);
      toast({
        title: 'Success',
        description: 'Class created successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create class',
        variant: 'destructive',
      });
    },
  });

  // Update class mutation
  const updateClassMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Class> }) => {
      const { error } = await supabase
        .from('classes')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacherClasses'] });
      setEditDialogOpen(false);
      setCancelDialogOpen(false);
      toast({
        title: 'Success',
        description: 'Class updated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update class',
        variant: 'destructive',
      });
    },
  });

  // Batch update mutation
  const batchUpdateMutation = useMutation({
    mutationFn: async ({ ids, data }: { ids: string[]; data: Partial<Class> }) => {
      const { error } = await supabase
        .from('classes')
        .update(data)
        .in('id', ids);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacherClasses'] });
      setSelectedClasses([]);
      toast({
        title: 'Success',
        description: 'Classes updated successfully',
      });
    },
  });

  // Clone class mutation
  const cloneClassMutation = useMutation({
    mutationFn: async (originalClass: Class) => {
      const { id: _, ...classData } = originalClass;
      const { data: newClass, error } = await supabase
        .from('classes')
        .insert({
          ...classData,
          name: cloneName,
          teacher_id: userData?.id,
        })
        .select();
      
      if (error) throw error;
      return newClass;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacherClasses'] });
      setCloneDialogOpen(false);
      toast({
        title: 'Success',
        description: 'Class cloned successfully',
      });
    },
  });

  // Add schedule mutation
  const addScheduleMutation = useMutation({
    mutationFn: async (data: ScheduleFormData & { class_id: string }) => {
      const { data: schedule, error } = await supabase
        .from('class_schedules')
        .insert({
          ...data,
          start_time: `${data.start_time}:00`,
          end_time: `${data.end_time}:00`,
          effective_from: data.effective_from || new Date().toISOString().split('T')[0],
        })
        .select();
      
      if (error) throw error;
      return schedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classSchedules'] });
      setAddScheduleDialogOpen(false);
      toast({
        title: 'Success',
        description: 'Schedule added successfully',
      });
    },
  });

  // Delete schedule mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('class_schedules')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classSchedules'] });
      setDeleteScheduleDialogOpen(false);
      toast({
        title: 'Success',
        description: 'Schedule deleted successfully',
      });
    },
  });

  // Remove student mutation
  const removeStudentMutation = useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { error } = await supabase
        .from('class_enrollments')
        .update({ status: 'cancelled' })
        .eq('id', enrollmentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classEnrollments'] });
      setRemoveStudentDialogOpen(false);
      toast({
        title: 'Success',
        description: 'Student removed successfully',
      });
    },
  });

  // Form for creating/editing classes
  const form = useForm<ClassFormData>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      name: '',
      description: '',
      level: 'intermediate',
      capacity: 6,
      type: 'group',
      is_online: false,
      materials: '',
      requirements: '',
    },
  });

  // Schedule form
  const scheduleForm = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      day_of_week: 1,
      start_time: '10:00',
      end_time: '11:30',
    },
  });

  // Reset form when editing
  useEffect(() => {
    if (editingClass) {
      form.reset({
        name: editingClass.name,
        description: editingClass.description,
        level: editingClass.level,
        capacity: editingClass.capacity,
        type: editingClass.type,
        is_online: editingClass.is_online,
        materials: editingClass.materials,
        requirements: editingClass.requirements,
      });
    }
  }, [editingClass, form]);

  // Filter classes
  const filteredClasses = classes.filter(cls => {
    const matchesStatus = statusFilter === 'all' || cls.status === statusFilter;
    const matchesSearch = cls.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Handle select all
  const handleSelectAll = () => {
    if (selectedClasses.length === filteredClasses.length) {
      setSelectedClasses([]);
    } else {
      setSelectedClasses(filteredClasses.map(cls => cls.id));
    }
  };

  // Handle class cancellation
  const handleCancelClass = () => {
    if (cancellingClass) {
      updateClassMutation.mutate({
        id: cancellingClass.id,
        data: { status: 'cancelled' },
      });
    }
  };

  // Handle materials update
  const handleUpdateMaterials = () => {
    if (viewingClass) {
      updateClassMutation.mutate({
        id: viewingClass.id,
        data: { materials, requirements },
      });
      setEditMaterialsDialogOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading classes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Class Management</h2>
          <p className="text-muted-foreground">Manage your classes and schedules</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Class
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search classes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label="Search classes"
            role="searchbox"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]" aria-label="Filter by status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Batch Actions */}
      {selectedClasses.length > 0 && (
        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
          <span className="text-sm font-medium">{selectedClasses.length} selected</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Batch Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() => batchUpdateMutation.mutate({
                  ids: selectedClasses,
                  data: { status: 'paused' },
                })}
              >
                Pause Selected
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => batchUpdateMutation.mutate({
                  ids: selectedClasses,
                  data: { status: 'active' },
                })}
              >
                Activate Selected
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Classes List */}
      <div className="space-y-4">
        {filteredClasses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64">
              <p className="text-muted-foreground">No classes found</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Select All */}
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedClasses.length === filteredClasses.length && filteredClasses.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <Label>Select all</Label>
            </div>

            {/* Class Cards */}
            {filteredClasses.map((cls) => (
              <Card key={cls.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedClasses.includes(cls.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedClasses([...selectedClasses, cls.id]);
                          } else {
                            setSelectedClasses(selectedClasses.filter(id => id !== cls.id));
                          }
                        }}
                      />
                      <div className="space-y-1">
                        <CardTitle>{cls.name}</CardTitle>
                        <CardDescription>{cls.description}</CardDescription>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="More options">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setEditingClass(cls);
                          setEditDialogOpen(true);
                        }}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setCloningClass(cls);
                          setCloneName(`${cls.name} (Copy)`);
                          setCloneDialogOpen(true);
                        }}>
                          <Copy className="mr-2 h-4 w-4" />
                          Clone Class
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setReschedulingClass(cls);
                          setRescheduleDialogOpen(true);
                        }}>
                          <Calendar className="mr-2 h-4 w-4" />
                          Reschedule
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            setCancellingClass(cls);
                            setCancelDialogOpen(true);
                          }}
                          className="text-destructive"
                        >
                          <X className="mr-2 h-4 w-4" />
                          Cancel Class
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Badge variant={cls.status === 'active' ? 'default' : cls.status === 'cancelled' ? 'destructive' : 'secondary'}>
                        {cls.status.charAt(0).toUpperCase() + cls.status.slice(1)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <BookOpen className="h-4 w-4" />
                      <span>{cls.level.charAt(0).toUpperCase() + cls.level.slice(1)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{cls.enrolled_count || 0}/{cls.capacity} enrolled</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{cls.type === 'group' ? 'Group' : '1-on-1'}</span>
                    </div>
                    {cls.is_online && (
                      <Badge variant="outline">Online</Badge>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingClass(cls);
                      setEditDialogOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewingClass(cls)}
                  >
                    View Details
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </>
        )}
      </div>

      {/* Create Class Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Class</DialogTitle>
            <DialogDescription>
              Set up a new class with details and schedule
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((data) => createClassMutation.mutate(data))}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Class Name</Label>
                <Input
                  id="name"
                  {...form.register('name')}
                  placeholder="e.g., Business English Advanced"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...form.register('description')}
                  placeholder="Brief description of the class"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="level">Level</Label>
                  <Select
                    value={form.watch('level')}
                    onValueChange={(value) => form.setValue('level', value as any)}
                  >
                    <SelectTrigger id="level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="capacity">Capacity</Label>
                  <Input
                    id="capacity"
                    type="number"
                    {...form.register('capacity', { valueAsNumber: true })}
                    min={1}
                    max={9}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="type">Class Type</Label>
                  <Select
                    value={form.watch('type')}
                    onValueChange={(value) => form.setValue('type', value as any)}
                  >
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="group">Group</SelectItem>
                      <SelectItem value="one-on-one">1-on-1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 mt-8">
                  <Switch
                    id="online"
                    checked={form.watch('is_online')}
                    onCheckedChange={(checked) => form.setValue('is_online', checked)}
                  />
                  <Label htmlFor="online">Online Class</Label>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="materials">Class Materials</Label>
                <Textarea
                  id="materials"
                  {...form.register('materials')}
                  placeholder="List of required materials"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="requirements">Requirements</Label>
                <Textarea
                  id="requirements"
                  {...form.register('requirements')}
                  placeholder="Prerequisites or requirements for students"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createClassMutation.isPending}>
                Create Class
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Class Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
            <DialogDescription>
              Update class information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((data) => {
            if (editingClass) {
              updateClassMutation.mutate({
                id: editingClass.id,
                data,
              });
            }
          })}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Class Name</Label>
                <Input
                  id="edit-name"
                  {...form.register('name')}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  {...form.register('description')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-level">Level</Label>
                  <Select
                    value={form.watch('level')}
                    onValueChange={(value) => form.setValue('level', value as any)}
                  >
                    <SelectTrigger id="edit-level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-capacity">Capacity</Label>
                  <Input
                    id="edit-capacity"
                    type="number"
                    {...form.register('capacity', { valueAsNumber: true })}
                    min={1}
                    max={9}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-type">Class Type</Label>
                  <Select
                    value={form.watch('type')}
                    onValueChange={(value) => form.setValue('type', value as any)}
                  >
                    <SelectTrigger id="edit-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="group">Group</SelectItem>
                      <SelectItem value="one-on-one">1-on-1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 mt-8">
                  <Switch
                    id="edit-online"
                    checked={form.watch('is_online')}
                    onCheckedChange={(checked) => form.setValue('is_online', checked)}
                  />
                  <Label htmlFor="edit-online">Online Class</Label>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-materials">Class Materials</Label>
                <Textarea
                  id="edit-materials"
                  {...form.register('materials')}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-requirements">Requirements</Label>
                <Textarea
                  id="edit-requirements"
                  {...form.register('requirements')}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateClassMutation.isPending}>
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Class Details Dialog */}
      <Dialog open={!!viewingClass} onOpenChange={(open) => !open && setViewingClass(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{viewingClass?.name}</DialogTitle>
            <DialogDescription>
              Manage schedules, students, and materials
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="schedule">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="materials">Materials</TabsTrigger>
            </TabsList>

            <TabsContent value="schedule" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Class Schedule</h3>
                <Button size="sm" onClick={() => setAddScheduleDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Schedule
                </Button>
              </div>
              
              {schedules.length === 0 ? (
                <Card>
                  <CardContent className="flex items-center justify-center h-32">
                    <p className="text-muted-foreground">No schedules set</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {schedules.map((schedule) => (
                    <Card key={schedule.id}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div>
                          <p className="font-medium">{dayNames[schedule.day_of_week]}</p>
                          <p className="text-sm text-muted-foreground">
                            {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeletingSchedule(schedule);
                            setDeleteScheduleDialogOpen(true);
                          }}
                          aria-label="Delete schedule"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="students" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Enrolled Students ({enrollments.length}/{viewingClass?.capacity})</h3>
              </div>
              
              {enrollments.length === 0 ? (
                <Card>
                  <CardContent className="flex items-center justify-center h-32">
                    <p className="text-muted-foreground">No students enrolled</p>
                  </CardContent>
                </Card>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Enrolled</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrollments.map((enrollment) => (
                      <TableRow key={enrollment.id}>
                        <TableCell>{enrollment.student.full_name}</TableCell>
                        <TableCell>{enrollment.student.email}</TableCell>
                        <TableCell>
                          {format(new Date(enrollment.enrolled_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setRemovingEnrollment(enrollment);
                              setRemoveStudentDialogOpen(true);
                            }}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="materials" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Class Materials & Requirements</h3>
                <Button
                  size="sm"
                  onClick={() => {
                    setMaterials(viewingClass?.materials || '');
                    setRequirements(viewingClass?.requirements || '');
                    setEditMaterialsDialogOpen(true);
                  }}
                >
                  Edit Materials
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Materials</h4>
                  <Card>
                    <CardContent className="p-4">
                      <p className="whitespace-pre-wrap">
                        {viewingClass?.materials || 'No materials specified'}
                      </p>
                    </CardContent>
                  </Card>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Requirements</h4>
                  <Card>
                    <CardContent className="p-4">
                      <p className="whitespace-pre-wrap">
                        {viewingClass?.requirements || 'No requirements specified'}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Clone Class Dialog */}
      <Dialog open={cloneDialogOpen} onOpenChange={setCloneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone Class</DialogTitle>
            <DialogDescription>
              Create a copy of "{cloningClass?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="clone-name">New Class Name</Label>
              <Input
                id="clone-name"
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloneDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (cloningClass) {
                  cloneClassMutation.mutate(cloningClass);
                }
              }}
              disabled={cloneClassMutation.isPending}
            >
              Clone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Class Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Class</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel "{cancellingClass?.name}"? This action will notify all enrolled students.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelClass}>
              Confirm Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Class</DialogTitle>
            <DialogDescription>
              Choose new time slots for "{reschedulingClass?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">Reschedule functionality coming soon...</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Schedule Dialog */}
      <Dialog open={addScheduleDialogOpen} onOpenChange={setAddScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Schedule</DialogTitle>
            <DialogDescription>
              Add a new time slot for this class
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={scheduleForm.handleSubmit((data) => {
            if (viewingClass) {
              addScheduleMutation.mutate({
                ...data,
                class_id: viewingClass.id,
              });
            }
          })}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="day">Day of Week</Label>
                <Select
                  value={scheduleForm.watch('day_of_week').toString()}
                  onValueChange={(value) => scheduleForm.setValue('day_of_week', parseInt(value))}
                >
                  <SelectTrigger id="day">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dayNames.map((day, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="start">Start Time</Label>
                  <Input
                    id="start"
                    type="time"
                    {...scheduleForm.register('start_time')}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="end">End Time</Label>
                  <Input
                    id="end"
                    type="time"
                    {...scheduleForm.register('end_time')}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddScheduleDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addScheduleMutation.isPending}>
                Add Schedule
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Materials Dialog */}
      <Dialog open={editMaterialsDialogOpen} onOpenChange={setEditMaterialsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Materials & Requirements</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-class-materials">Class Materials</Label>
              <Textarea
                id="edit-class-materials"
                value={materials}
                onChange={(e) => setMaterials(e.target.value)}
                rows={4}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-class-requirements">Requirements</Label>
              <Textarea
                id="edit-class-requirements"
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMaterialsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateMaterials}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Student Dialog */}
      <AlertDialog open={removeStudentDialogOpen} onOpenChange={setRemoveStudentDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {removingEnrollment?.student.full_name} from this class?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removingEnrollment) {
                  removeStudentMutation.mutate(removingEnrollment.id);
                }
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Schedule Dialog */}
      <AlertDialog open={deleteScheduleDialogOpen} onOpenChange={setDeleteScheduleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this schedule slot?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingSchedule) {
                  deleteScheduleMutation.mutate(deletingSchedule.id);
                }
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success/Error Messages */}
      {updateClassMutation.isSuccess && (
        <div role="status" className="sr-only">
          Class cancelled successfully
        </div>
      )}
      
      {createClassMutation.isError && (
        <div role="alert" className="sr-only">
          Failed to create class
        </div>
      )}
    </div>
  );
}