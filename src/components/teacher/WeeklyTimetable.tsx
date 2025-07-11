'use client';

import { logger } from '@/lib/services';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, User, Edit3, Trash2, Plus, ArrowLeft, ArrowRight, Save, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/supabase';
import { format, startOfWeek, addDays, addWeeks, subWeeks, parseISO, isSameDay } from 'date-fns';

interface WeeklyTimetableProps {
  teacher: any;
  weeklyBookings: any[];
  availability: any[];
  availableSlots: any[];
}

const TIME_SLOTS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30'
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

export function WeeklyTimetable({ teacher, weeklyBookings, availability, availableSlots }: WeeklyTimetableProps) {
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date()));
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [draggedBooking, setDraggedBooking] = useState<any>(null);
  const [dropTarget, setDropTarget] = useState<{ day: number; time: string } | null>(null);
  const [bookings, setBookings] = useState(weeklyBookings);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    setBookings(weeklyBookings);
  }, [weeklyBookings]);

  const weekDays = DAYS_OF_WEEK.map(day => ({
    ...day,
    date: addDays(currentWeek, day.value)
  }));

  const getBookingForSlot = (dayIndex: number, timeSlot: string) => {
    return bookings.find(booking => {
      const bookingDate = parseISO(booking.start_time);
      const bookingDay = bookingDate.getDay();
      const bookingTime = bookingDate.toTimeString().slice(0, 5);
      
      return bookingDay === dayIndex && bookingTime === timeSlot;
    });
  };

  const isSlotAvailable = (dayIndex: number, timeSlot: string) => {
    const dayAvailability = availability.find(a => a.day_of_week === dayIndex);
    if (!dayAvailability || !dayAvailability.is_available) return false;
    
    return dayAvailability.time_slots?.some((slot: any) => 
      slot.is_available && 
      timeSlot >= slot.start_time && 
      timeSlot < slot.end_time
    );
  };

  const handleDragStart = (e: React.DragEvent, booking: any) => {
    setDraggedBooking(booking);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, day: number, time: string) => {
    if (isSlotAvailable(day, time) && !getBookingForSlot(day, time)) {
      e.preventDefault();
      setDropTarget({ day, time });
    }
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = async (e: React.DragEvent, targetDay: number, targetTime: string) => {
    e.preventDefault();
    setDropTarget(null);
    
    if (!draggedBooking || !isSlotAvailable(targetDay, targetTime)) return;

    try {
      // Calculate new start and end times
      const targetDate = addDays(currentWeek, targetDay);
      const [hours, minutes] = targetTime.split(':').map(Number);
      targetDate.setHours(hours, minutes, 0, 0);
      
      const duration = draggedBooking.class?.course?.duration_minutes || 60;
      const endTime = new Date(targetDate.getTime() + duration * 60000);

      // Update booking in database
      const { error } = await supabase
        .from('bookings')
        .update({
          start_time: targetDate.toISOString(),
          end_time: endTime.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', draggedBooking.id);

      if (error) throw error;

      // Update local state
      setBookings(prev => prev.map(booking => 
        booking.id === draggedBooking.id 
          ? { ...booking, start_time: targetDate.toISOString(), end_time: endTime.toISOString() }
          : booking
      ));

      toast({
        title: 'Booking Rescheduled',
        description: `Class moved to ${format(targetDate, 'EEEE, MMM dd')} at ${targetTime}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reschedule booking. Please try again.',
        variant: 'destructive',
      });
      logger.error('Error rescheduling booking:', error);
    }
    
    setDraggedBooking(null);
  };

  const handleBookingEdit = async (bookingData: any) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          notes: bookingData.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedBooking.id);

      if (error) throw error;

      setBookings(prev => prev.map(booking => 
        booking.id === selectedBooking.id 
          ? { ...booking, notes: bookingData.notes }
          : booking
      ));

      toast({
        title: 'Booking Updated',
        description: 'Class details have been saved successfully.',
      });
      
      setSelectedBooking(null);
      setEditMode(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update booking. Please try again.',
        variant: 'destructive',
      });
      logger.error('Error updating booking:', error);
    }
  };

  const handleBookingCancel = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (error) throw error;

      setBookings(prev => prev.filter(booking => booking.id !== bookingId));

      toast({
        title: 'Booking Cancelled',
        description: 'The class has been cancelled successfully.',
      });
      
      setSelectedBooking(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to cancel booking. Please try again.',
        variant: 'destructive',
      });
      logger.error('Error cancelling booking:', error);
    }
  };

  const getBookingStatusColor = (booking: any) => {
    if (booking.status === 'cancelled') return 'bg-red-100 border-red-300 text-red-800';
    if (booking.attendance?.[0]?.status === 'present') return 'bg-green-100 border-green-300 text-green-800';
    if (booking.attendance?.[0]?.status === 'absent') return 'bg-red-100 border-red-300 text-red-800';
    if (booking.attendance?.[0]?.status === 'late') return 'bg-yellow-100 border-yellow-300 text-yellow-800';
    
    const bookingTime = parseISO(booking.start_time);
    const isUpcoming = bookingTime > new Date();
    
    return isUpcoming ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-gray-100 border-gray-300 text-gray-800';
  };

  const BookingCard = ({ booking }: { booking: any }) => (
    <div
      draggable
      onDragStart={(e) => handleDragStart(e, booking)}
      onClick={() => setSelectedBooking(booking)}
      className={`
        p-2 rounded-md border-2 cursor-move hover:shadow-md transition-all duration-200
        ${getBookingStatusColor(booking)}
        ${draggedBooking?.id === booking.id ? 'opacity-50' : ''}
      `}
    >
      <div className="text-xs font-medium truncate">
        {booking.class?.class_name || booking.class?.course?.title}
      </div>
      <div className="text-xs opacity-75">
        {booking.student?.full_name}
      </div>
      <div className="text-xs opacity-75">
        {booking.class?.course?.duration_minutes || 60}min
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Week Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Weekly Timetable</CardTitle>
              <CardDescription>
                {format(currentWeek, 'MMM dd')} - {format(addDays(currentWeek, 6), 'MMM dd, yyyy')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeek(startOfWeek(new Date()))}
              >
                This Week
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Timetable Grid */}
          <div className="grid grid-cols-8 gap-1 text-sm">
            {/* Header */}
            <div className="p-2 font-medium text-center">Time</div>
            {weekDays.map(day => (
              <div key={day.value} className="p-2 font-medium text-center">
                <div>{day.short}</div>
                <div className="text-xs text-muted-foreground">
                  {format(day.date, 'dd')}
                </div>
              </div>
            ))}

            {/* Time Slots */}
            {TIME_SLOTS.map(timeSlot => (
              <React.Fragment key={timeSlot}>
                {/* Time Label */}
                <div className="p-2 text-xs text-muted-foreground text-center border-r">
                  {timeSlot}
                </div>
                
                {/* Day Slots */}
                {weekDays.map(day => {
                  const booking = getBookingForSlot(day.value, timeSlot);
                  const isAvailable = isSlotAvailable(day.value, timeSlot);
                  const isDropTarget = dropTarget?.day === day.value && dropTarget?.time === timeSlot;
                  
                  return (
                    <div
                      key={`${day.value}-${timeSlot}`}
                      className={`
                        min-h-[60px] p-1 border border-border relative
                        ${isAvailable ? 'bg-green-50' : 'bg-gray-50'}
                        ${isDropTarget ? 'bg-blue-100 ring-2 ring-blue-300' : ''}
                      `}
                      onDragOver={(e) => handleDragOver(e, day.value, timeSlot)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, day.value, timeSlot)}
                    >
                      {booking && <BookingCard booking={booking} />}
                      {!booking && isAvailable && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <Plus className="h-4 w-4 text-green-600" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-50 border border-green-300 rounded"></div>
              <span>Available Slot</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
              <span>Upcoming Class</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
              <span>Cancelled/Absent</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Booking Details Dialog */}
      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Class Details</DialogTitle>
            <DialogDescription>
              {selectedBooking && format(parseISO(selectedBooking.start_time), 'EEEE, MMMM dd, yyyy at h:mm a')}
            </DialogDescription>
          </DialogHeader>
          
          {selectedBooking && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Course</label>
                <div className="p-2 bg-muted rounded-md">
                  {selectedBooking.class?.class_name || selectedBooking.class?.course?.title}
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Student</label>
                <div className="p-2 bg-muted rounded-md">
                  {selectedBooking.student?.full_name}
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Duration</label>
                <div className="p-2 bg-muted rounded-md">
                  {selectedBooking.class?.course?.duration_minutes || 60} minutes
                </div>
              </div>

              {editMode ? (
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea
                    placeholder="Add notes about this class..."
                    defaultValue={selectedBooking.notes || ''}
                    id="notes"
                  />
                </div>
              ) : (
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Notes</label>
                  <div className="p-2 bg-muted rounded-md min-h-[60px]">
                    {selectedBooking.notes || 'No notes added'}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {editMode ? (
                  <>
                    <Button
                      onClick={() => {
                        const notes = (document.getElementById('notes') as HTMLTextAreaElement)?.value;
                        handleBookingEdit({ notes });
                      }}
                      size="sm"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setEditMode(false)}
                      size="sm"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setEditMode(true)}
                      size="sm"
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleBookingCancel(selectedBooking.id)}
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Cancel Class
                    </Button>
                  </>
                )}
              </div>

              {selectedBooking.attendance?.[0] && (
                <div className="pt-2 border-t">
                  <div className="text-sm font-medium mb-2">Attendance</div>
                  <Badge variant={selectedBooking.attendance[0].status === 'present' ? 'default' : 'destructive'}>
                    {selectedBooking.attendance[0].status}
                  </Badge>
                  {selectedBooking.attendance[0].notes && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {selectedBooking.attendance[0].notes}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}