'use client';

import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'sonner';
import {
  Search,
  Filter,
  Download,
  Eye,
  Star,
  Bookmark,
  Share2,
  Play,
  FileText,
  Music,
  Link,
  Clock,
  Users,
  TrendingUp,
  Calendar,
  Upload,
  BarChart3,
  BookOpen,
  Wifi,
  WifiOff,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';

interface LearningMaterial {
  id: string;
  title: string;
  description: string;
  category: 'video' | 'document' | 'audio' | 'link';
  file_type: string;
  file_size: number | null;
  file_url: string;
  thumbnail_url: string | null;
  course_id: string;
  course: { name: string };
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  duration: number | null;
  view_count: number;
  download_count: number;
  average_rating: number;
  created_at: string;
  updated_at: string;
}

interface MaterialProgress {
  id: string;
  material_id: string;
  student_id: string;
  progress_percentage: number;
  completed: boolean;
  last_accessed: string;
}

interface MaterialBookmark {
  id: string;
  material_id: string;
  student_id: string;
  created_at: string;
}

interface MaterialReview {
  id: string;
  material_id: string;
  student_id: string;
  rating: number;
  comment: string;
  created_at: string;
  student: { full_name: string };
}

export function StudentLearningMaterials() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCourse, setFilterCourse] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMaterial, setSelectedMaterial] = useState<LearningMaterial | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const supabase = createClientComponentClient();
  const queryClient = useQueryClient();
  const itemsPerPage = 12;

  // Fetch materials
  const { data: materials = [], isLoading, error } = useQuery({
    queryKey: ['learning-materials', searchTerm, filterType, filterCourse, filterDifficulty, sortBy, currentPage],
    queryFn: async () => {
      let query = supabase
        .from('learning_materials')
        .select(`
          *,
          course:courses(name)
        `);

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,tags.cs.{${searchTerm}}`);
      }

      if (filterType !== 'all') {
        query = query.eq('category', filterType);
      }

      if (filterCourse !== 'all') {
        query = query.eq('course_id', filterCourse);
      }

      if (filterDifficulty !== 'all') {
        query = query.eq('difficulty_level', filterDifficulty);
      }

      switch (sortBy) {
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'popular':
          query = query.order('view_count', { ascending: false });
          break;
        case 'rating':
          query = query.order('average_rating', { ascending: false });
          break;
        case 'title':
          query = query.order('title', { ascending: true });
          break;
      }

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch progress
  const { data: progress = [] } = useQuery({
    queryKey: ['material-progress'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from('material_progress')
        .select('*')
        .eq('student_id', user.user.id);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch bookmarks
  const { data: bookmarks = [] } = useQuery({
    queryKey: ['material-bookmarks'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from('material_bookmarks')
        .select('*')
        .eq('student_id', user.user.id);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch recently viewed
  const { data: recentlyViewed = [] } = useQuery({
    queryKey: ['recently-viewed'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from('learning_materials')
        .select(`
          *,
          course:courses(name),
          material_progress!inner(last_accessed)
        `)
        .eq('material_progress.student_id', user.user.id)
        .order('material_progress.last_accessed', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch recommended
  const { data: recommended = [] } = useQuery({
    queryKey: ['recommended-materials'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      // Simple recommendation: materials from courses the student is enrolled in
      const { data, error } = await supabase
        .from('learning_materials')
        .select(`
          *,
          course:courses(name)
        `)
        .order('average_rating', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch offline materials
  const { data: offlineMaterials = [] } = useQuery({
    queryKey: ['offline-materials'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from('learning_materials')
        .select(`
          *,
          course:courses(name),
          offline_downloads!inner(downloaded_at)
        `)
        .eq('offline_downloads.student_id', user.user.id)
        .order('offline_downloads.downloaded_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Update progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async ({ materialId, progressPercentage }: { materialId: string; progressPercentage: number }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('material_progress')
        .upsert({
          material_id: materialId,
          student_id: user.user.id,
          progress_percentage: progressPercentage,
          completed: progressPercentage >= 100,
          last_accessed: new Date().toISOString(),
        }, {
          onConflict: 'material_id,student_id'
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-progress'] });
    },
  });

  // Bookmark mutation
  const bookmarkMutation = useMutation({
    mutationFn: async (materialId: string) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const existingBookmark = bookmarks.find(b => b.material_id === materialId);

      if (existingBookmark) {
        const { error } = await supabase
          .from('material_bookmarks')
          .delete()
          .eq('id', existingBookmark.id);

        if (error) throw error;
        return 'removed';
      } else {
        const { data, error } = await supabase
          .from('material_bookmarks')
          .insert({
            material_id: materialId,
            student_id: user.user.id,
          });

        if (error) throw error;
        return 'added';
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['material-bookmarks'] });
      toast.success(result === 'added' ? 'Material bookmarked' : 'Bookmark removed');
    },
  });

  // Rating mutation
  const ratingMutation = useMutation({
    mutationFn: async ({ materialId, rating, comment }: { materialId: string; rating: number; comment?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('material_reviews')
        .insert({
          material_id: materialId,
          student_id: user.user.id,
          rating,
          comment: comment || null,
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-materials'] });
      toast.success(review ? 'Review submitted' : 'Rating submitted');
      setIsRatingOpen(false);
      setIsReviewOpen(false);
      setRating(0);
      setReview('');
    },
  });

  // Download mutation
  const downloadMutation = useMutation({
    mutationFn: async (material: LearningMaterial) => {
      const { data, error } = await supabase.storage
        .from('learning-materials')
        .download(material.file_url);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${material.title}.${material.file_type}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return data;
    },
    onSuccess: () => {
      toast.success('Download started');
    },
  });

  // Offline download mutation
  const offlineDownloadMutation = useMutation({
    mutationFn: async (materialId: string) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const material = materials.find(m => m.id === materialId);
      if (!material) throw new Error('Material not found');

      const { data, error } = await supabase.storage
        .from('learning-materials')
        .download(material.file_url);

      if (error) throw error;

      // Store in local storage for offline access
      const { error: insertError } = await supabase
        .from('offline_downloads')
        .insert({
          material_id: materialId,
          student_id: user.user.id,
          downloaded_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offline-materials'] });
      toast.success('Material saved for offline access');
    },
  });

  // Share mutation
  const shareMutation = useMutation({
    mutationFn: async ({ materialId, classmateIds }: { materialId: string; classmateIds: string[] }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const shares = classmateIds.map(classmateId => ({
        material_id: materialId,
        shared_by: user.user.id,
        shared_with: classmateId,
        shared_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from('material_shares')
        .insert(shares);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Material shared successfully');
      setIsShareOpen(false);
    },
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ file, title, description }: { file: File; title: string; description: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const fileName = `student-notes/${Date.now()}-${file.name}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('learning-materials')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from('learning_materials')
        .insert({
          title,
          description,
          category: file.type.startsWith('image/') ? 'document' : 
                   file.type.startsWith('audio/') ? 'audio' :
                   file.type.startsWith('video/') ? 'video' : 'document',
          file_type: file.name.split('.').pop() || 'unknown',
          file_size: file.size,
          file_url: uploadData.path,
          course_id: null, // Student uploads aren't tied to specific courses
          difficulty_level: 'beginner',
          tags: ['student-created'],
          created_by: user.user.id,
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-materials'] });
      toast.success('Study notes uploaded successfully');
      setIsUploadOpen(false);
      setUploadFile(null);
    },
  });

  // Helper functions
  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i))} ${sizes[i]}`;
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '';
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minutes`;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'video': return <Play className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      case 'audio': return <Music className="h-4 w-4" />;
      case 'link': return <Link className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getCategoryLabel = (category: string): string => {
    switch (category) {
      case 'video': return 'Video';
      case 'document': return 'Document';
      case 'audio': return 'Audio';
      case 'link': return 'Link';
      default: return 'File';
    }
  };

  const getFileTypeLabel = (fileType: string): string => {
    switch (fileType) {
      case 'mp4': return 'Video file';
      case 'pdf': return 'PDF file';
      case 'mp3': return 'Audio file';
      case 'url': return 'External link';
      default: return 'File';
    }
  };

  const getMaterialProgress = (materialId: string): MaterialProgress | undefined => {
    return progress.find(p => p.material_id === materialId);
  };

  const isBookmarked = (materialId: string): boolean => {
    return bookmarks.some(b => b.material_id === materialId);
  };

  const handleView = (material: LearningMaterial) => {
    updateProgressMutation.mutate({ materialId: material.id, progressPercentage: 10 });
    // Open material in new tab or preview
    if (material.category === 'link') {
      window.open(material.file_url, '_blank');
    } else {
      setSelectedMaterial(material);
      setIsPreviewOpen(true);
    }
  };

  const handlePreview = (material: LearningMaterial) => {
    setSelectedMaterial(material);
    setIsPreviewOpen(true);
  };

  const handleDownload = (material: LearningMaterial) => {
    downloadMutation.mutate(material);
  };

  const handleOfflineDownload = (materialId: string) => {
    offlineDownloadMutation.mutate(materialId);
  };

  const handleBookmark = (materialId: string) => {
    bookmarkMutation.mutate(materialId);
  };

  const handleRate = (material: LearningMaterial) => {
    setSelectedMaterial(material);
    setIsRatingOpen(true);
  };

  const handleReview = (material: LearningMaterial) => {
    setSelectedMaterial(material);
    setIsReviewOpen(true);
  };

  const handleShare = (material: LearningMaterial) => {
    setSelectedMaterial(material);
    setIsShareOpen(true);
  };

  const submitRating = () => {
    if (selectedMaterial && rating > 0) {
      ratingMutation.mutate({
        materialId: selectedMaterial.id,
        rating,
        comment: review,
      });
    }
  };

  const submitUpload = () => {
    if (uploadFile) {
      uploadMutation.mutate({
        file: uploadFile,
        title: uploadFile.name,
        description: 'Student-created study material',
      });
    }
  };

  // Group materials by course
  const materialsByCourse = materials.reduce((acc, material) => {
    const courseName = material.course?.name || 'General';
    if (!acc[courseName]) {
      acc[courseName] = [];
    }
    acc[courseName].push(material);
    return acc;
  }, {} as Record<string, LearningMaterial[]>);

  const totalPages = Math.ceil(materials.length / itemsPerPage);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading materials...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error loading materials</p>
          <p className="text-sm text-gray-600">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Learning Materials</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsAnalyticsOpen(true)}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          <Button onClick={() => setIsUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Study Notes
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border p-4 space-y-4">
        <div role="search" className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search materials by title, description, or tags..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search materials"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="document">Document</SelectItem>
              <SelectItem value="audio">Audio</SelectItem>
              <SelectItem value="link">Link</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterCourse} onValueChange={setFilterCourse}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              <SelectItem value="course-1">Business English</SelectItem>
              <SelectItem value="course-2">Everyday English A</SelectItem>
              <SelectItem value="course-3">Speak Up</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="title">Alphabetical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="all">All Materials</TabsTrigger>
          <TabsTrigger value="recent">Recently Viewed</TabsTrigger>
          <TabsTrigger value="recommended">Recommended</TabsTrigger>
          <TabsTrigger value="offline">Offline Materials</TabsTrigger>
          <TabsTrigger value="course">By Course</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {materials.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No learning materials available</h3>
              <p className="text-gray-600">Check back later for new materials</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {materials.map((material) => {
                  const materialProgress = getMaterialProgress(material.id);
                  const bookmarked = isBookmarked(material.id);

                  return (
                    <Card key={material.id} className="group hover:shadow-lg transition-shadow" role="article">
                      <CardHeader className="space-y-2">
                        <div className="flex items-start justify-between">
                          <Badge variant="secondary" className="flex items-center gap-1">
                            {getCategoryIcon(material.category)}
                            {getCategoryLabel(material.category)}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Filter className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleBookmark(material.id)}>
                                <Bookmark className={`h-4 w-4 mr-2 ${bookmarked ? 'fill-current' : ''}`} />
                                {bookmarked ? 'Remove Bookmark' : 'Bookmark'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleShare(material)}>
                                <Share2 className="h-4 w-4 mr-2" />
                                Share
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOfflineDownload(material.id)}>
                                <WifiOff className="h-4 w-4 mr-2" />
                                Download for Offline
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <CardTitle className="text-sm line-clamp-2">{material.title}</CardTitle>
                        <p className="text-xs text-gray-600 line-clamp-2">{material.description}</p>

                        {material.thumbnail_url && (
                          <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
                            <img
                              src={material.thumbnail_url}
                              alt={material.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </CardHeader>

                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{material.course?.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {material.difficulty_level}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span aria-label={getFileTypeLabel(material.file_type)}>
                            {material.file_size && formatFileSize(material.file_size)}
                          </span>
                          {material.duration && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(material.duration)}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {material.view_count}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-3 w-3 ${
                                  star <= Math.round(material.average_rating)
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                            <span className="text-xs text-gray-500 ml-1">
                              ({material.average_rating.toFixed(1)})
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleBookmark(material.id)}
                            aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark material'}
                          >
                            <Bookmark className={`h-4 w-4 ${bookmarked ? 'fill-current' : ''}`} />
                          </Button>
                        </div>

                        {materialProgress && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>Progress</span>
                              <span>
                                {materialProgress.completed ? 'Completed' : `${materialProgress.progress_percentage}%`}
                              </span>
                            </div>
                            <Progress value={materialProgress.progress_percentage} className="h-2" />
                          </div>
                        )}

                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handlePreview(material)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Preview
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleView(material)}
                          >
                            View
                          </Button>
                          {material.category !== 'link' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(material)}
                            >
                              Download
                            </Button>
                          )}
                        </div>

                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleRate(material)}
                          >
                            Rate
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleReview(material)}
                          >
                            Review
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleShare(material)}
                            aria-label="Share material"
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {material.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {material.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{material.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      aria-label="Next page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="recent" role="tabpanel">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentlyViewed.map((material) => (
              <Card key={material.id}>
                <CardHeader>
                  <CardTitle className="text-sm">{material.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-600">{material.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recommended" role="tabpanel">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommended.map((material) => (
              <Card key={material.id}>
                <CardHeader>
                  <CardTitle className="text-sm">{material.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-600">{material.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="offline" role="tabpanel">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {offlineMaterials.map((material) => (
              <Card key={material.id}>
                <CardHeader>
                  <CardTitle className="text-sm">{material.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-600">{material.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="course" role="tabpanel">
          <div className="space-y-6">
            {Object.entries(materialsByCourse).map(([courseName, courseMaterials]) => (
              <Card key={courseName}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {courseName} ({courseMaterials.length})
                    <Badge variant="secondary">{courseMaterials.length} materials</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {courseMaterials.map((material) => (
                      <div key={material.id} className="border rounded-lg p-3">
                        <h4 className="font-medium text-sm">{material.title}</h4>
                        <p className="text-xs text-gray-600 mt-1">{material.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedMaterial?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>{selectedMaterial?.description}</p>
            {selectedMaterial?.duration && (
              <p className="text-sm text-gray-600">Duration: {formatDuration(selectedMaterial.duration)}</p>
            )}
            {selectedMaterial?.category === 'video' && (
              <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
                <p className="text-white">Video preview would be displayed here</p>
              </div>
            )}
            {selectedMaterial?.category === 'document' && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <p>Document preview would be displayed here</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Rating Dialog */}
      <Dialog open={isRatingOpen} onOpenChange={setIsRatingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate Material</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Button
                  key={star}
                  variant="ghost"
                  size="sm"
                  onClick={() => setRating(star)}
                  aria-label={`${star} stars`}
                >
                  <Star
                    className={`h-6 w-6 ${
                      star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                    }`}
                  />
                </Button>
              ))}
            </div>
            <Button onClick={submitRating} disabled={rating === 0} className="w-full">
              Submit Rating
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Write Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Button
                  key={star}
                  variant="ghost"
                  size="sm"
                  onClick={() => setRating(star)}
                >
                  <Star
                    className={`h-6 w-6 ${
                      star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                    }`}
                  />
                </Button>
              ))}
            </div>
            <Textarea
              placeholder="Write your review..."
              value={review}
              onChange={(e) => setReview(e.target.value)}
            />
            <Button onClick={submitRating} disabled={rating === 0} className="w-full">
              Submit Review
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Material</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="classmates">Select classmates</Label>
              <Select>
                <SelectTrigger id="classmates" aria-label="Select classmates">
                  <SelectValue placeholder="Choose classmates..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jane">Jane Smith</SelectItem>
                  <SelectItem value="john">John Doe</SelectItem>
                  <SelectItem value="mary">Mary Johnson</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => shareMutation.mutate({ materialId: selectedMaterial?.id || '', classmateIds: ['jane'] })} className="w-full">
              Share
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Study Notes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="file-upload">Select file</Label>
              <Input
                id="file-upload"
                type="file"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                aria-label="Select file to upload"
              />
            </div>
            <Button onClick={submitUpload} disabled={!uploadFile} className="w-full">
              Upload
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Analytics Dialog */}
      <Dialog open={isAnalyticsOpen} onOpenChange={setIsAnalyticsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Learning Analytics</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600">Total Materials Viewed: 25</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600">Total Time Spent: 2 hours</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600">Materials Completed: 10</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600">Favorite Category: Video</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Reviews Button */}
      <div className="hidden">
        <Button>View Reviews</Button>
      </div>
    </main>
  );
}