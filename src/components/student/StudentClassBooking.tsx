"use client";

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  BookOpen,
  User,
  Filter,
  Search,
  ChevronDown,
  Check,
  X,
  AlertCircle,
  CheckCircle,
  Star,
  Heart,
  MoreVertical,
  Edit3,
  Trash2,
  RefreshCw,
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { format, isAfter, isBefore, parseISO, addDays } from 'date-fns';
import type { Booking, BookingWithDetails, ClassWithTeacher } from '@/types/database';

// Types for available time slots
interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  isBooked?: boolean;
  price: number;
}

interface AvailableClass {
  id: string;
  title: string;
  description: string;
  type: 'individual' | 'group';
  level: 'beginner' | 'intermediate' | 'advanced';
  duration_minutes: number;
  max_students: number;
  current_students: number;
  price_per_student: number;
  teacher_name: string;
  teacher_avatar?: string;
  teacher_rating: number;
  availableSlots: TimeSlot[];
  location?: string;
  meeting_link?: string;
  tags?: string[];
}

interface BookingFormData {
  classId: string;
  timeSlotId: string;
  scheduledDate: string;
  notes?: string;
  recurringPattern: 'none' | 'weekly' | 'biweekly' | 'monthly';
  recurringEndDate?: string;
}

interface StudentClassBookingProps {
  studentId: string;
  isLoading?: boolean;
  onBookClass?: (booking: BookingFormData) => Promise<boolean>;
  onCancelBooking?: (bookingId: string, reason?: string) => Promise<boolean>;
  onRescheduleBooking?: (bookingId: string, newTimeSlot: TimeSlot, newDate: string) => Promise<boolean>;
  onAddToWishlist?: (classId: string) => void;
  onRemoveFromWishlist?: (classId: string) => void;
  wishlistedClasses?: string[];
}

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmed: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  completed: 'bg-blue-100 text-blue-800 border-blue-200',
  'no-show': 'bg-gray-100 text-gray-800 border-gray-200',
  rescheduled: 'bg-purple-100 text-purple-800 border-purple-200',
};

const TYPE_COLORS = {
  individual: 'bg-blue-50 text-blue-700 border-blue-200',
  group: 'bg-green-50 text-green-700 border-green-200',
};

const LEVEL_COLORS = {
  beginner: 'bg-green-50 text-green-700 border-green-200',
  intermediate: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  advanced: 'bg-red-50 text-red-700 border-red-200',
};

export function StudentClassBooking({
  studentId,
  isLoading = false,
  onBookClass,
  onCancelBooking,
  onRescheduleBooking,
  onAddToWishlist,
  onRemoveFromWishlist,
  wishlistedClasses = [],
}: StudentClassBookingProps) {
  // State management
  const [activeTab, setActiveTab] = useState<'available' | 'booked' | 'history'>('available');
  const [selectedClass, setSelectedClass] = useState<AvailableClass | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);
  const [bookingFormData, setBookingFormData] = useState<BookingFormData>({
    classId: '',
    timeSlotId: '',
    scheduledDate: '',
    notes: '',
    recurringPattern: 'none',
  });
  const [cancellationReason, setCancellationReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [processing, setProcessing] = useState(false);

  // Mock data - in real implementation, this would come from props or API calls
  const mockAvailableClasses: AvailableClass[] = [
    {
      id: '1',
      title: 'Business English Conversation',
      description: 'Improve your professional communication skills with real-world scenarios',
      type: 'group',
      level: 'intermediate',
      duration_minutes: 60,
      max_students: 6,
      current_students: 3,
      price_per_student: 45.00,
      teacher_name: 'Sarah Johnson',
      teacher_rating: 4.8,
      location: 'Room A-201',
      availableSlots: [
        { id: 'slot1', startTime: '09:00', endTime: '10:00', isAvailable: true, price: 45.00 },
        { id: 'slot2', startTime: '14:00', endTime: '15:00', isAvailable: true, price: 45.00 },
        { id: 'slot3', startTime: '19:00', endTime: '20:00', isAvailable: false, price: 45.00 },
      ],
      tags: ['Business', 'Conversation', 'Professional'],
    },
    {
      id: '2',
      title: 'IELTS Speaking Preparation',
      description: 'One-on-one coaching for IELTS speaking test with personalized feedback',
      type: 'individual',
      level: 'advanced',
      duration_minutes: 45,
      max_students: 1,
      current_students: 0,
      price_per_student: 80.00,
      teacher_name: 'David Chen',
      teacher_rating: 4.9,
      meeting_link: 'https://zoom.us/j/123456789',
      availableSlots: [
        { id: 'slot4', startTime: '10:00', endTime: '10:45', isAvailable: true, price: 80.00 },
        { id: 'slot5', startTime: '15:30', endTime: '16:15', isAvailable: true, price: 80.00 },
      ],
      tags: ['IELTS', 'Speaking', 'Test Prep'],
    },
    {
      id: '3',
      title: 'Everyday English for Beginners',
      description: 'Learn basic English for daily conversations and common situations',
      type: 'group',
      level: 'beginner',
      duration_minutes: 90,
      max_students: 8,
      current_students: 5,
      price_per_student: 35.00,
      teacher_name: 'Emily Rodriguez',
      teacher_rating: 4.7,
      location: 'Room B-103',
      availableSlots: [
        { id: 'slot6', startTime: '11:00', endTime: '12:30', isAvailable: true, price: 35.00 },
        { id: 'slot7', startTime: '16:00', endTime: '17:30', isAvailable: true, price: 35.00 },
      ],
      tags: ['Beginner', 'Conversation', 'Daily English'],
    },
  ];

  const mockBookedClasses: BookingWithDetails[] = [
    {
      id: 'booking1',
      class_id: '1',
      student_id: studentId,
      teacher_id: 'teacher1',
      scheduled_at: format(addDays(new Date(), 2), "yyyy-MM-dd'T'09:00:00"),
      duration_minutes: 60,
      status: 'confirmed',
      total_price: 45.00,
      currency: 'USD',
      notes: 'Looking forward to improving my presentation skills',
      cancellation_reason: null,
      cancelled_at: null,
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      recurring_pattern: 'weekly',
      recurring_end_date: format(addDays(new Date(), 60), 'yyyy-MM-dd'),
      parent_booking_id: null,
      metadata: null,
      student: {
        id: studentId,
        email: 'student@example.com',
        role: 'student' as const,
        first_name: 'John',
        last_name: 'Doe',
        phone: null,
        avatar_url: null,
        timezone: 'UTC',
        language: 'en',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_sign_in_at: null,
        email_verified_at: null,
        is_active: true,
        metadata: null,
      },
      teacher: {
        id: 'teacher1',
        email: 'sarah@example.com',
        role: 'teacher' as const,
        first_name: 'Sarah',
        last_name: 'Johnson',
        phone: null,
        avatar_url: null,
        timezone: 'UTC',
        language: 'en',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_sign_in_at: null,
        email_verified_at: null,
        is_active: true,
        metadata: null,
      },
      class: {
        id: '1',
        title: 'Business English Conversation',
        description: 'Improve your professional communication skills',
        type: 'group' as const,
        level: 'intermediate' as const,
        duration_minutes: 60,
        max_students: 6,
        price_per_student: 45.00,
        currency: 'USD',
        teacher_id: 'teacher1',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: null,
      },
    },
  ];

  // Filter available classes
  const filteredClasses = useMemo(() => {
    return mockAvailableClasses.filter((classItem) => {
      const matchesSearch = classItem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          classItem.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          classItem.teacher_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLevel = filterLevel === 'all' || classItem.level === filterLevel;
      const matchesType = filterType === 'all' || classItem.type === filterType;
      
      return matchesSearch && matchesLevel && matchesType;
    });
  }, [searchTerm, filterLevel, filterType]);

  // Handle booking class
  const handleBookClass = async () => {
    if (!selectedClass || !selectedTimeSlot) return;

    setProcessing(true);
    try {
      const success = await onBookClass?.({
        classId: selectedClass.id,
        timeSlotId: selectedTimeSlot.id,
        scheduledDate: `${selectedDate}T${selectedTimeSlot.startTime}:00`,
        notes: bookingFormData.notes,
        recurringPattern: bookingFormData.recurringPattern,
        recurringEndDate: bookingFormData.recurringEndDate,
      });

      if (success) {
        setShowBookingDialog(false);
        resetBookingForm();
      }
    } catch (error) {
      console.error('Failed to book class:', error);
    } finally {
      setProcessing(false);
    }
  };

  // Handle cancel booking
  const handleCancelBooking = async () => {
    if (!selectedBooking) return;

    setProcessing(true);
    try {
      const success = await onCancelBooking?.(selectedBooking.id, cancellationReason);
      if (success) {
        setShowCancelDialog(false);
        setCancellationReason('');
        setSelectedBooking(null);
      }
    } catch (error) {
      console.error('Failed to cancel booking:', error);
    } finally {
      setProcessing(false);
    }
  };

  // Reset booking form
  const resetBookingForm = () => {
    setSelectedClass(null);
    setSelectedTimeSlot(null);
    setBookingFormData({
      classId: '',
      timeSlotId: '',
      scheduledDate: '',
      notes: '',
      recurringPattern: 'none',
    });
  };

  // Open booking dialog
  const openBookingDialog = (classItem: AvailableClass, timeSlot: TimeSlot) => {
    setSelectedClass(classItem);
    setSelectedTimeSlot(timeSlot);
    setBookingFormData(prev => ({
      ...prev,
      classId: classItem.id,
      timeSlotId: timeSlot.id,
      scheduledDate: `${selectedDate}T${timeSlot.startTime}:00`,
    }));
    setShowBookingDialog(true);
  };

  // Render available classes
  const renderAvailableClasses = () => (
    <div className="space-y-6">
      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search classes, teachers, or topics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              <Filter className="h-4 w-4 mr-2" />
              Level: {filterLevel === 'all' ? 'All' : filterLevel}
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setFilterLevel('all')}>All Levels</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterLevel('beginner')}>Beginner</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterLevel('intermediate')}>Intermediate</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterLevel('advanced')}>Advanced</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              <Users className="h-4 w-4 mr-2" />
              Type: {filterType === 'all' ? 'All' : filterType}
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setFilterType('all')}>All Types</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterType('individual')}>Individual</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterType('group')}>Group</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Date selector */}
      <div className="flex items-center gap-4">
        <Label htmlFor="date-select" className="text-sm font-medium">Select Date:</Label>
        <Input
          id="date-select"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          min={format(new Date(), 'yyyy-MM-dd')}
          className="w-auto"
        />
      </div>

      {/* Available classes grid */}
      <div className="grid gap-6">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-4" />
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredClasses.length === 0 ? (
          <Card className="p-8 text-center">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No classes found</h3>
            <p className="text-gray-600">
              {searchTerm ? 'Try adjusting your search or filters' : 'No classes available for the selected criteria'}
            </p>
          </Card>
        ) : (
          filteredClasses.map((classItem) => (
            <Card key={classItem.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{classItem.title}</CardTitle>
                      {wishlistedClasses.includes(classItem.id) ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveFromWishlist?.(classItem.id)}
                          className="p-1 h-auto text-red-500 hover:text-red-700"
                        >
                          <Heart className="h-4 w-4 fill-current" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onAddToWishlist?.(classItem.id)}
                          className="p-1 h-auto text-gray-400 hover:text-red-500"
                        >
                          <Heart className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{classItem.description}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge className={cn("text-xs", TYPE_COLORS[classItem.type])}>
                        {classItem.type}
                      </Badge>
                      <Badge className={cn("text-xs", LEVEL_COLORS[classItem.level])}>
                        {classItem.level}
                      </Badge>
                      {classItem.tags?.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {classItem.duration_minutes} min
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {classItem.current_students}/{classItem.max_students} students
                      </div>
                      {classItem.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {classItem.location}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      ${classItem.price_per_student}
                    </div>
                    <div className="text-sm text-gray-500">per session</div>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{classItem.teacher_name}</div>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500 fill-current" />
                        <span className="text-xs text-gray-600">{classItem.teacher_rating}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Available Time Slots:</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {classItem.availableSlots.map((slot) => (
                      <Button
                        key={slot.id}
                        variant={slot.isAvailable ? "outline" : "ghost"}
                        disabled={!slot.isAvailable}
                        onClick={() => slot.isAvailable && openBookingDialog(classItem, slot)}
                        className={cn(
                          "flex flex-col items-center justify-center h-auto py-3",
                          slot.isAvailable 
                            ? "hover:bg-blue-50 hover:border-blue-300" 
                            : "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <div className="font-medium">
                          {slot.startTime} - {slot.endTime}
                        </div>
                        <div className="text-xs text-gray-500">
                          {slot.isAvailable ? `$${slot.price}` : 'Booked'}
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );

  // Render booked classes
  const renderBookedClasses = () => (
    <div className="space-y-4">
      {mockBookedClasses.length === 0 ? (
        <Card className="p-8 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No upcoming bookings</h3>
          <p className="text-gray-600">Book your first class to get started!</p>
        </Card>
      ) : (
        mockBookedClasses.map((booking) => (
          <Card key={booking.id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{booking.class.title}</h3>
                    <Badge className={cn("text-xs", STATUS_COLORS[booking.status])}>
                      {booking.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {format(parseISO(booking.scheduled_at), 'MMM dd, yyyy')}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {format(parseISO(booking.scheduled_at), 'HH:mm')} - {format(parseISO(booking.scheduled_at), 'HH:mm')}
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {booking.teacher.first_name} {booking.teacher.last_name}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {booking.class.type} class
                    </div>
                  </div>

                  {booking.notes && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <Label className="text-xs font-medium text-gray-700">Notes:</Label>
                      <p className="text-sm text-gray-600 mt-1">{booking.notes}</p>
                    </div>
                  )}

                  {booking.recurring_pattern !== 'none' && (
                    <div className="flex items-center gap-2 text-sm text-blue-600 mb-4">
                      <RefreshCw className="h-4 w-4" />
                      Recurring {booking.recurring_pattern} until {booking.recurring_end_date}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <div className="text-right">
                    <div className="text-xl font-semibold text-blue-600">
                      ${booking.total_price}
                    </div>
                    <div className="text-xs text-gray-500">{booking.currency}</div>
                  </div>
                  
                  {booking.status === 'confirmed' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => {
                            setSelectedBooking(booking);
                            setShowRescheduleDialog(true);
                          }}
                        >
                          <Edit3 className="h-4 w-4 mr-2" />
                          Reschedule
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => {
                            setSelectedBooking(booking);
                            setShowCancelDialog(true);
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Cancel
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Class Booking</h1>
          <p className="text-gray-600">Book classes and manage your learning schedule</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <Button
            variant="ghost"
            onClick={() => setActiveTab('available')}
            className={cn(
              "pb-2 px-1 border-b-2 font-medium text-sm",
              activeTab === 'available' 
                ? "border-blue-500 text-blue-600" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            Available Classes
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('booked')}
            className={cn(
              "pb-2 px-1 border-b-2 font-medium text-sm",
              activeTab === 'booked' 
                ? "border-blue-500 text-blue-600" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            My Bookings
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('history')}
            className={cn(
              "pb-2 px-1 border-b-2 font-medium text-sm",
              activeTab === 'history' 
                ? "border-blue-500 text-blue-600" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            Class History
          </Button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'available' && renderAvailableClasses()}
        {activeTab === 'booked' && renderBookedClasses()}
        {activeTab === 'history' && (
          <Card className="p-8 text-center">
            <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Class History</h3>
            <p className="text-gray-600">Your completed classes will appear here</p>
          </Card>
        )}
      </div>

      {/* Booking Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Book Class</DialogTitle>
            <DialogDescription>
              Confirm your booking for {selectedClass?.title}
            </DialogDescription>
          </DialogHeader>
          
          {selectedClass && selectedTimeSlot && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium">{selectedClass.title}</h4>
                <div className="text-sm text-gray-600 mt-2 space-y-1">
                  <div>Date: {format(parseISO(selectedDate), 'MMM dd, yyyy')}</div>
                  <div>Time: {selectedTimeSlot.startTime} - {selectedTimeSlot.endTime}</div>
                  <div>Duration: {selectedClass.duration_minutes} minutes</div>
                  <div>Teacher: {selectedClass.teacher_name}</div>
                  <div className="font-medium text-blue-600">Price: ${selectedTimeSlot.price}</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any specific goals or notes for this class..."
                  value={bookingFormData.notes}
                  onChange={(e) => setBookingFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recurring">Recurring Pattern</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {bookingFormData.recurringPattern === 'none' ? 'One-time booking' : 
                       bookingFormData.recurringPattern.charAt(0).toUpperCase() + bookingFormData.recurringPattern.slice(1)}
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full">
                    <DropdownMenuItem onClick={() => setBookingFormData(prev => ({ ...prev, recurringPattern: 'none' }))}>
                      One-time booking
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setBookingFormData(prev => ({ ...prev, recurringPattern: 'weekly' }))}>
                      Weekly
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setBookingFormData(prev => ({ ...prev, recurringPattern: 'biweekly' }))}>
                      Bi-weekly
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setBookingFormData(prev => ({ ...prev, recurringPattern: 'monthly' }))}>
                      Monthly
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {bookingFormData.recurringPattern !== 'none' && (
                <div className="space-y-2">
                  <Label htmlFor="recurring-end">End Date for Recurring</Label>
                  <Input
                    id="recurring-end"
                    type="date"
                    value={bookingFormData.recurringEndDate || ''}
                    onChange={(e) => setBookingFormData(prev => ({ ...prev, recurringEndDate: e.target.value }))}
                    min={format(addDays(parseISO(selectedDate), 7), 'yyyy-MM-dd')}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowBookingDialog(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleBookClass} 
              disabled={processing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {processing ? 'Booking...' : 'Confirm Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this booking? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Cancelling within 24 hours may result in a cancellation fee.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="cancellation-reason">Reason for cancellation (optional)</Label>
              <Textarea
                id="cancellation-reason"
                placeholder="Please tell us why you're cancelling..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCancelDialog(false)}
              disabled={processing}
            >
              Keep Booking
            </Button>
            <Button 
              variant="destructive"
              onClick={handleCancelBooking} 
              disabled={processing}
            >
              {processing ? 'Cancelling...' : 'Cancel Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Class</DialogTitle>
            <DialogDescription>
              Choose a new time for your class
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                This feature allows you to reschedule your booking to a different available time slot.
                Implementation would include available slot selection similar to the booking flow.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowRescheduleDialog(false)}
            >
              Cancel
            </Button>
            <Button>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}