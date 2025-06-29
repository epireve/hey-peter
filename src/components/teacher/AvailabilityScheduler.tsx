'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Clock, Save, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/supabase';

interface TimeSlot {
  start_time: string;
  end_time: string;
  is_available: boolean;
  max_bookings?: number;
}

interface DayAvailability {
  day_of_week: number;
  is_available: boolean;
  time_slots: TimeSlot[];
}

interface AvailabilitySchedulerProps {
  teacher: any;
  availability: any[];
  existingBookings: any[];
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
  { value: 0, label: 'Sunday', short: 'Sun' },
];

export function AvailabilityScheduler({ teacher, availability, existingBookings }: AvailabilitySchedulerProps) {
  const [schedule, setSchedule] = useState<DayAvailability[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  // Initialize schedule from existing availability
  useEffect(() => {
    const initialSchedule = DAYS_OF_WEEK.map(day => {
      const existingDay = availability.find(a => a.day_of_week === day.value);
      return {
        day_of_week: day.value,
        is_available: existingDay?.is_available || false,
        time_slots: existingDay?.time_slots || [
          { start_time: '09:00', end_time: '10:00', is_available: true, max_bookings: 1 }
        ]
      };
    });
    setSchedule(initialSchedule);
  }, [availability]);

  const updateDayAvailability = (dayIndex: number, isAvailable: boolean) => {
    setSchedule(prev => prev.map((day, index) => 
      index === dayIndex 
        ? { ...day, is_available: isAvailable }
        : day
    ));
  };

  const addTimeSlot = (dayIndex: number) => {
    setSchedule(prev => prev.map((day, index) => 
      index === dayIndex 
        ? {
            ...day,
            time_slots: [
              ...day.time_slots,
              { start_time: '09:00', end_time: '10:00', is_available: true, max_bookings: 1 }
            ]
          }
        : day
    ));
  };

  const removeTimeSlot = (dayIndex: number, slotIndex: number) => {
    setSchedule(prev => prev.map((day, index) => 
      index === dayIndex 
        ? {
            ...day,
            time_slots: day.time_slots.filter((_, i) => i !== slotIndex)
          }
        : day
    ));
  };

  const updateTimeSlot = (dayIndex: number, slotIndex: number, field: keyof TimeSlot, value: any) => {
    setSchedule(prev => prev.map((day, index) => 
      index === dayIndex 
        ? {
            ...day,
            time_slots: day.time_slots.map((slot, i) => 
              i === slotIndex 
                ? { ...slot, [field]: value }
                : slot
            )
          }
        : day
    ));
  };

  const getBookingConflicts = (dayOfWeek: number, timeSlot: TimeSlot) => {
    return existingBookings.filter(booking => {
      const bookingDate = new Date(booking.start_time);
      const bookingDay = bookingDate.getDay();
      const bookingTime = bookingDate.toTimeString().slice(0, 5);
      
      return bookingDay === dayOfWeek && 
             bookingTime >= timeSlot.start_time && 
             bookingTime < timeSlot.end_time;
    });
  };

  const saveAvailability = async () => {
    setSaving(true);
    try {
      // Delete existing availability for this teacher
      await supabase
        .from('teacher_availability')
        .delete()
        .eq('teacher_id', teacher.id);

      // Insert new availability
      const availabilityData = schedule
        .filter(day => day.is_available && day.time_slots.length > 0)
        .map(day => ({
          teacher_id: teacher.id,
          day_of_week: day.day_of_week,
          is_available: day.is_available,
          time_slots: day.time_slots.filter(slot => slot.is_available)
        }));

      if (availabilityData.length > 0) {
        const { error } = await supabase
          .from('teacher_availability')
          .insert(availabilityData);

        if (error) throw error;
      }

      toast({
        title: 'Availability Updated',
        description: 'Your teaching schedule has been saved successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save availability. Please try again.',
        variant: 'destructive',
      });
      console.error('Error saving availability:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Days</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {schedule.filter(day => day.is_available).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Days per week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Time Slots</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {schedule.reduce((total, day) => 
                total + (day.is_available ? day.time_slots.filter(slot => slot.is_available).length : 0), 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Available slots
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Bookings</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{existingBookings.length}</div>
            <p className="text-xs text-muted-foreground">
              Scheduled classes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Availability Scheduler */}
      <Tabs defaultValue="weekly" className="space-y-4">
        <TabsList>
          <TabsTrigger value="weekly">Weekly Schedule</TabsTrigger>
          <TabsTrigger value="conflicts">Booking Conflicts</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Teaching Schedule</CardTitle>
              <CardDescription>
                Set your available days and time slots for student bookings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {schedule.map((day, dayIndex) => {
                const dayInfo = DAYS_OF_WEEK.find(d => d.value === day.day_of_week);
                return (
                  <div key={day.day_of_week} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-medium">{dayInfo?.label}</h3>
                        <Switch
                          checked={day.is_available}
                          onCheckedChange={(checked) => updateDayAvailability(dayIndex, checked)}
                        />
                        {day.is_available && (
                          <Badge variant="outline">Available</Badge>
                        )}
                      </div>
                      
                      {day.is_available && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addTimeSlot(dayIndex)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Time Slot
                        </Button>
                      )}
                    </div>

                    {day.is_available && (
                      <div className="space-y-3">
                        {day.time_slots.map((slot, slotIndex) => {
                          const conflicts = getBookingConflicts(day.day_of_week, slot);
                          return (
                            <div key={slotIndex} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={slot.is_available}
                                  onCheckedChange={(checked) => 
                                    updateTimeSlot(dayIndex, slotIndex, 'is_available', checked)
                                  }
                                />
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Input
                                  type="time"
                                  value={slot.start_time}
                                  onChange={(e) => 
                                    updateTimeSlot(dayIndex, slotIndex, 'start_time', e.target.value)
                                  }
                                  className="w-32"
                                />
                                <span>to</span>
                                <Input
                                  type="time"
                                  value={slot.end_time}
                                  onChange={(e) => 
                                    updateTimeSlot(dayIndex, slotIndex, 'end_time', e.target.value)
                                  }
                                  className="w-32"
                                />
                              </div>

                              <div className="flex items-center gap-2">
                                <label className="text-sm">Max bookings:</label>
                                <Input
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={slot.max_bookings || 1}
                                  onChange={(e) => 
                                    updateTimeSlot(dayIndex, slotIndex, 'max_bookings', parseInt(e.target.value))
                                  }
                                  className="w-20"
                                />
                              </div>

                              {conflicts.length > 0 && (
                                <Badge variant="destructive">
                                  {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''}
                                </Badge>
                              )}

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeTimeSlot(dayIndex, slotIndex)}
                                disabled={day.time_slots.length === 1}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="flex gap-3 pt-4">
                <Button onClick={saveAvailability} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Availability'}
                </Button>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Cancel Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conflicts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Booking Conflicts</CardTitle>
              <CardDescription>
                Review existing bookings that may conflict with your availability changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {existingBookings.length > 0 ? (
                <div className="space-y-3">
                  {existingBookings.map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">
                          {booking.class?.class_name || booking.class?.course?.title}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {new Date(booking.start_time).toLocaleDateString()} at {' '}
                          {new Date(booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {booking.class?.course?.course_type}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No upcoming bookings</h3>
                  <p>You have no scheduled classes that could conflict with availability changes.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}