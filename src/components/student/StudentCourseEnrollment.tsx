"use client";

import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Clock,
  Users,
  Star,
  Calendar,
  CheckCircle,
  AlertCircle,
  Info,
  Search,
  Filter,
  ChevronDown,
  MapPin,
  DollarSign,
  Award,
  X,
  Heart,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface Course {
  id: string;
  title: string;
  description: string;
  level: string;
  duration: string;
  price: number;
  rating: number;
  studentsEnrolled: number;
  instructor: string;
  format: string;
  schedule: string;
  image: string;
  category: string;
  prerequisites: string[];
  isEnrolled: boolean;
  isPremium: boolean;
  nextStartDate: string;
  syllabus: { week: number; topic: string }[];
}

interface StudentCourseEnrollmentProps {
  courses: Course[];
  studentId: string;
  isLoading?: boolean;
  enableComparison?: boolean;
  onEnroll?: (courseId: string) => Promise<boolean>;
  onWishlist?: (courseId: string) => void;
}

const categories = ['All', 'Business English', 'Conversation', 'Test Preparation', 'Grammar'];
const levels = ['All', 'Beginner', 'Intermediate', 'Advanced'];
const formats = ['All', 'Online', 'In-person', 'Hybrid'];

export function StudentCourseEnrollment({
  courses,
  studentId,
  isLoading = false,
  enableComparison = false,
  onEnroll,
  onWishlist,
}: StudentCourseEnrollmentProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('All');
  const [selectedFormat, setSelectedFormat] = useState('All');
  const [sortBy, setSortBy] = useState('title');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);
  const [enrollmentStatus, setEnrollmentStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });
  const [comparedCourses, setComparedCourses] = useState<string[]>([]);
  const [wishlistedCourses, setWishlistedCourses] = useState<string[]>([]);

  const filteredAndSortedCourses = useMemo(() => {
    let filtered = courses.filter((course) => {
      const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          course.instructor.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || course.category === selectedCategory;
      const matchesLevel = selectedLevel === 'All' || course.level === selectedLevel;
      const matchesFormat = selectedFormat === 'All' || course.format === selectedFormat;
      
      return matchesSearch && matchesCategory && matchesLevel && matchesFormat;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return a.price - b.price;
        case 'rating':
          return b.rating - a.rating;
        case 'students':
          return b.studentsEnrolled - a.studentsEnrolled;
        case 'title':
        default:
          return a.title.localeCompare(b.title);
      }
    });

    return filtered;
  }, [courses, searchQuery, selectedCategory, selectedLevel, selectedFormat, sortBy]);

  const handleEnrollClick = (courseId: string) => {
    setEnrollingCourseId(courseId);
    setShowEnrollDialog(true);
  };

  const handleEnrollConfirm = async () => {
    if (!enrollingCourseId || !onEnroll) return;

    try {
      const success = await onEnroll(enrollingCourseId);
      if (success) {
        setEnrollmentStatus({
          type: 'success',
          message: 'Enrollment successful! You will receive confirmation shortly.',
        });
      }
    } catch (error) {
      setEnrollmentStatus({
        type: 'error',
        message: 'Enrollment failed. Please try again later.',
      });
    } finally {
      setShowEnrollDialog(false);
      setEnrollingCourseId(null);
    }
  };

  const handleWishlist = (courseId: string) => {
    if (wishlistedCourses.includes(courseId)) {
      setWishlistedCourses(prev => prev.filter(id => id !== courseId));
    } else {
      setWishlistedCourses(prev => [...prev, courseId]);
    }
    onWishlist?.(courseId);
  };

  const handleCompareToggle = (courseId: string) => {
    if (comparedCourses.includes(courseId)) {
      setComparedCourses(prev => prev.filter(id => id !== courseId));
    } else if (comparedCourses.length < 3) {
      setComparedCourses(prev => [...prev, courseId]);
    }
  };

  const formatPrice = (price: number) => `RM ${price.toLocaleString()}`;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div data-testid="courses-loading" className="space-y-6">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <Skeleton className="h-48 w-full" />
              <CardContent className="p-6">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-4" />
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No courses available</h3>
        <p className="text-muted-foreground">Check back later for new course offerings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold">Available Courses</h1>
        {enableComparison && comparedCourses.length > 0 && (
          <Button>
            Compare Courses ({comparedCourses.length})
          </Button>
        )}
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses, instructors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Level</DropdownMenuLabel>
              {levels.map((level) => (
                <DropdownMenuItem
                  key={level}
                  onClick={() => setSelectedLevel(level)}
                  className={selectedLevel === level ? 'bg-accent' : ''}
                >
                  {level}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Format</DropdownMenuLabel>
              {formats.map((format) => (
                <DropdownMenuItem
                  key={format}
                  onClick={() => setSelectedFormat(format)}
                  className={selectedFormat === format ? 'bg-accent' : ''}
                >
                  {format}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Sort
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSortBy('title')}>
                Name A-Z
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('price')}>
                Price: Low to High
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('rating')}>
                Highest Rated
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('students')}>
                Most Popular
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(category)}
            className="whitespace-nowrap"
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Enrollment Status Alert */}
      {enrollmentStatus.type && (
        <Alert variant={enrollmentStatus.type === 'error' ? 'destructive' : 'default'}>
          {enrollmentStatus.type === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{enrollmentStatus.message}</AlertDescription>
        </Alert>
      )}

      {/* Courses Grid */}
      <div 
        data-testid="courses-grid" 
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 responsive-grid"
      >
        {filteredAndSortedCourses.map((course) => (
          <Card
            key={course.id}
            data-testid="course-card"
            className={cn(
              "overflow-hidden transition-all hover:shadow-lg",
              course.isEnrolled && "border-green-500"
            )}
          >
            <div className="relative">
              <img
                src={course.image}
                alt={course.title}
                className="w-full h-48 object-cover"
              />
              {course.isPremium && (
                <Badge className="absolute top-2 right-2 bg-yellow-500">
                  Premium
                </Badge>
              )}
              {enableComparison && (
                <div className="absolute top-2 left-2">
                  <input
                    type="checkbox"
                    data-testid="compare-checkbox"
                    checked={comparedCourses.includes(course.id)}
                    onChange={() => handleCompareToggle(course.id)}
                    className="w-4 h-4"
                  />
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                data-testid="wishlist-button"
                onClick={() => handleWishlist(course.id)}
                className="absolute bottom-2 right-2"
              >
                <Heart
                  className={cn(
                    "h-4 w-4",
                    wishlistedCourses.includes(course.id) ? "fill-red-500 text-red-500" : ""
                  )}
                />
              </Button>
            </div>

            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{course.title}</CardTitle>
                  <p className="text-muted-foreground text-sm mt-1">{course.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  <span>{course.rating}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{course.studentsEnrolled} students</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Course Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  <span>{course.level}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{course.duration}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{course.format}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(course.nextStartDate)}</span>
                </div>
              </div>

              {/* Schedule */}
              <div className="text-sm">
                <span className="font-medium">Schedule: </span>
                <span className="text-muted-foreground">{course.schedule}</span>
              </div>

              {/* Instructor */}
              <div className="text-sm">
                <span className="font-medium">Instructor: </span>
                <span className="text-muted-foreground">{course.instructor}</span>
              </div>

              {/* Prerequisites */}
              {course.prerequisites.length > 0 && (
                <div className="text-sm">
                  <span className="font-medium">Prerequisites: </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {course.prerequisites.map((prereq, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {prereq}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Price */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-lg font-bold">{formatPrice(course.price)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCourse(course)}
                  className="flex-1"
                >
                  View Details
                </Button>
                {course.isEnrolled ? (
                  <Button disabled className="flex-1">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Enrolled
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleEnrollClick(course.id)}
                    className="flex-1"
                  >
                    Enroll Now
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Course Details Modal */}
      {selectedCourse && (
        <Dialog open={!!selectedCourse} onOpenChange={() => setSelectedCourse(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Course Details</DialogTitle>
              <DialogDescription>
                Complete information about {selectedCourse.title}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <img
                src={selectedCourse.image}
                alt={selectedCourse.title}
                className="w-full h-64 object-cover rounded-lg"
              />

              <div>
                <h3 className="text-lg font-semibold mb-2">{selectedCourse.title}</h3>
                <p className="text-muted-foreground">{selectedCourse.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Level:</span> {selectedCourse.level}
                </div>
                <div>
                  <span className="font-medium">Duration:</span> {selectedCourse.duration}
                </div>
                <div>
                  <span className="font-medium">Format:</span> {selectedCourse.format}
                </div>
                <div>
                  <span className="font-medium">Price:</span> {formatPrice(selectedCourse.price)}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Syllabus</h4>
                <div className="space-y-2">
                  {selectedCourse.syllabus.map((item, index) => (
                    <div key={index} className="flex gap-3">
                      <Badge variant="outline">Week {item.week}</Badge>
                      <span className="text-sm">{item.topic}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedCourse(null)}>
                Close
              </Button>
              {!selectedCourse.isEnrolled && (
                <Button onClick={() => {
                  setSelectedCourse(null);
                  handleEnrollClick(selectedCourse.id);
                }}>
                  Enroll Now
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Enrollment Confirmation Dialog */}
      <Dialog open={showEnrollDialog} onOpenChange={setShowEnrollDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Enrollment</DialogTitle>
            <DialogDescription>
              Are you sure you want to enroll in this course? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEnrollDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEnrollConfirm}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}