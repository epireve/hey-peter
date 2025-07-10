'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
// Removed useToast import - using inline notifications for testing
import { Plus, Trash2, Clock, Save, Copy, X, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AvailabilitySlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  timezone: string;
}

interface AvailabilitySchedulerProps {
  teacherId: string;
  availability: AvailabilitySlot[];
  onSave: (availability: AvailabilitySlot[]) => Promise<void>;
  isLoading?: boolean;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
];

const TIMEZONES = [
  'Asia/Singapore',
  'Asia/Jakarta',
  'Asia/Manila',
  'Asia/Tokyo',
  'Asia/Seoul',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Australia/Sydney',
];

export function AvailabilityScheduler({
  teacherId,
  availability,
  onSave,
  isLoading = false,
}: AvailabilitySchedulerProps) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>(availability);
  const [timezone, setTimezone] = useState(availability[0]?.timezone || 'Asia/Singapore');
  const [editingSlot, setEditingSlot] = useState<AvailabilitySlot | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copyFromDay, setCopyFromDay] = useState<number | null>(null);
  const [copyToDays, setCopyToDays] = useState<number[]>([]);
  const [deleteSlotId, setDeleteSlotId] = useState<string | null>(null);
  const [isClearAllOpen, setIsClearAllOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Group slots by day
  const slotsByDay = useMemo(() => {
    const grouped: Record<number, AvailabilitySlot[]> = {};
    DAYS_OF_WEEK.forEach(day => {
      grouped[day.value] = slots
        .filter(slot => slot.day_of_week === day.value)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));
    });
    return grouped;
  }, [slots]);

  // Calculate total hours
  const totalHoursByDay = useMemo(() => {
    const hours: Record<number, number> = {};
    Object.entries(slotsByDay).forEach(([day, daySlots]) => {
      hours[Number(day)] = daySlots.reduce((total, slot) => {
        const [startHour, startMin] = slot.start_time.split(':').map(Number);
        const [endHour, endMin] = slot.end_time.split(':').map(Number);
        const duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);
        return total + duration / 60;
      }, 0);
    });
    return hours;
  }, [slotsByDay]);

  const totalWeeklyHours = Object.values(totalHoursByDay).reduce((sum, hours) => sum + hours, 0);

  const validateTimeSlot = (slot: Partial<AvailabilitySlot>, dayOfWeek: number): string | null => {
    if (!slot.start_time || !slot.end_time) {
      return 'Please enter both start and end times';
    }

    if (slot.start_time >= slot.end_time) {
      return 'End time must be after start time';
    }

    // Check for overlaps
    const daySlots = slotsByDay[dayOfWeek] || [];
    const hasOverlap = daySlots.some(existing => {
      if (editingSlot && existing.id === editingSlot.id) return false;
      return (
        (slot.start_time! >= existing.start_time && slot.start_time! < existing.end_time) ||
        (slot.end_time! > existing.start_time && slot.end_time! <= existing.end_time) ||
        (slot.start_time! <= existing.start_time && slot.end_time! >= existing.end_time)
      );
    });

    if (hasOverlap) {
      return 'This time slot overlaps with existing time slot';
    }

    return null;
  };

  const handleAddSlot = (dayOfWeek: number) => {
    setEditingSlot({
      id: `new-${Date.now()}`,
      day_of_week: dayOfWeek,
      start_time: '09:00',
      end_time: '10:00',
      is_available: true,
      timezone,
    });
    setIsEditModalOpen(true);
  };

  const handleEditSlot = (slot: AvailabilitySlot) => {
    setEditingSlot(slot);
    setIsEditModalOpen(true);
  };

  const handleSaveSlot = () => {
    if (!editingSlot) return;

    const error = validateTimeSlot(editingSlot, editingSlot.day_of_week);
    if (error) {
      // Show validation error
      const toastDiv = document.createElement('div');
      toastDiv.textContent = error;
      toastDiv.setAttribute('role', 'alert');
      document.body.appendChild(toastDiv);
      setTimeout(() => document.body.removeChild(toastDiv), 100);
      return;
    }

    if (editingSlot.id.startsWith('new-')) {
      // Add new slot
      setSlots([...slots, { ...editingSlot, id: Date.now().toString() }]);
    } else {
      // Update existing slot
      setSlots(slots.map(slot => 
        slot.id === editingSlot.id ? editingSlot : slot
      ));
    }

    setIsEditModalOpen(false);
    setEditingSlot(null);
  };

  const handleDeleteSlot = (slotId: string) => {
    setSlots(slots.filter(slot => slot.id !== slotId));
    setDeleteSlotId(null);
  };

  const handleCopySchedule = () => {
    if (!copyFromDay || copyToDays.length === 0) return;

    const sourceSlots = slotsByDay[copyFromDay] || [];
    const newSlots: AvailabilitySlot[] = [];

    copyToDays.forEach(targetDay => {
      // Remove existing slots for target day
      const filteredSlots = slots.filter(slot => slot.day_of_week !== targetDay);
      
      // Add copied slots
      const copiedSlots = sourceSlots.map(slot => ({
        ...slot,
        id: `${Date.now()}-${targetDay}-${slot.start_time}`,
        day_of_week: targetDay,
      }));

      newSlots.push(...filteredSlots, ...copiedSlots);
    });

    setSlots(newSlots);
    setIsCopyModalOpen(false);
    setCopyFromDay(null);
    setCopyToDays([]);
  };

  const handleClearAll = () => {
    setSlots([]);
    setIsClearAllOpen(false);
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      // Update all slots with current timezone
      const slotsWithTimezone = slots.map(slot => ({
        ...slot,
        timezone,
      }));
      
      await onSave(slotsWithTimezone);
      
      // Show success message
      const toastDiv = document.createElement('div');
      toastDiv.textContent = 'Availability saved successfully';
      toastDiv.setAttribute('role', 'alert');
      document.body.appendChild(toastDiv);
      setTimeout(() => document.body.removeChild(toastDiv), 100);
    } catch (error) {
      // Show error message
      const toastDiv = document.createElement('div');
      toastDiv.textContent = 'Failed to save availability';
      toastDiv.setAttribute('role', 'alert');
      document.body.appendChild(toastDiv);
      setTimeout(() => document.body.removeChild(toastDiv), 100);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div data-testid="availability-skeleton" className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-4">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" role="region" aria-label="Availability Schedule">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Availability Schedule</CardTitle>
          <CardDescription>Set your weekly teaching availability</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Label htmlFor="timezone">Time Zone</Label>
              <select
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="flex h-10 w-64 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {TIMEZONES.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total weekly hours: {totalWeeklyHours.toFixed(0)}</p>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsClearAllOpen(true)}
                className="mt-2"
              >
                Clear All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Days Schedule */}
      <div className="grid gap-4">
        {DAYS_OF_WEEK.map(day => {
          const daySlots = slotsByDay[day.value] || [];
          const dayHours = totalHoursByDay[day.value] || 0;
          const hasAvailability = daySlots.length > 0;

          return (
            <Card
              key={day.value}
              data-testid={`day-${day.value}`}
              className={cn(hasAvailability && 'has-availability border-primary')}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{day.label}</CardTitle>
                    {dayHours > 0 && (
                      <p className="text-sm text-muted-foreground">{dayHours} hours</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {hasAvailability && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCopyFromDay(day.value);
                          setIsCopyModalOpen(true);
                        }}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy to other days
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddSlot(day.value)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add time slot
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {daySlots.length > 0 ? (
                  <div className="space-y-2">
                    {daySlots.map(slot => (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer"
                        onClick={() => handleEditSlot(slot)}
                      >
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {slot.start_time} - {slot.end_time}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteSlotId(slot.id);
                          }}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-4 text-muted-foreground">
                    No availability set for this day
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveChanges}
          disabled={isSaving}
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSlot?.id.startsWith('new-') ? 'Add' : 'Edit'} Availability for{' '}
              {DAYS_OF_WEEK.find(d => d.value === editingSlot?.day_of_week)?.label}
            </DialogTitle>
            <DialogDescription>
              Set the time slot for your availability
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="start-time">Start Time</Label>
              <Input
                id="start-time"
                type="time"
                value={editingSlot?.start_time || ''}
                onChange={(e) => setEditingSlot(prev => prev ? {...prev, start_time: e.target.value} : null)}
              />
            </div>
            <div>
              <Label htmlFor="end-time">End Time</Label>
              <Input
                id="end-time"
                type="time"
                value={editingSlot?.end_time || ''}
                onChange={(e) => setEditingSlot(prev => prev ? {...prev, end_time: e.target.value} : null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSlot}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy Schedule Modal */}
      <Dialog open={isCopyModalOpen} onOpenChange={setIsCopyModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Copy {DAYS_OF_WEEK.find(d => d.value === copyFromDay)?.label} Schedule to:
            </DialogTitle>
            <DialogDescription>
              Select the days to copy the schedule to
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {DAYS_OF_WEEK.filter(d => d.value !== copyFromDay).map(day => (
              <div key={day.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`copy-${day.value}`}
                  checked={copyToDays.includes(day.value)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setCopyToDays([...copyToDays, day.value]);
                    } else {
                      setCopyToDays(copyToDays.filter(d => d !== day.value));
                    }
                  }}
                />
                <Label htmlFor={`copy-${day.value}`}>{day.label}</Label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCopyModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCopySchedule}>Copy Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteSlotId} onOpenChange={() => setDeleteSlotId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Time Slot</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this time slot? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteSlotId && handleDeleteSlot(deleteSlotId)}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear All Confirmation */}
      <AlertDialog open={isClearAllOpen} onOpenChange={setIsClearAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Availability</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear all availability? This will remove all your time slots.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAll}>Clear All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status message for screen readers */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {isSaving && 'Saving availability...'}
      </div>
    </div>
  );
}