"use client";

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ConflictWarningSystem, ConflictIndicator } from '@/components/ui/conflict-warning-system';
import { useConflictDetection } from '@/hooks/useConflictDetection';
import { cn } from '@/lib/utils';
import { format, addDays } from 'date-fns';

export interface EnhancedBookingData {
  studentId: string;
  teacherId: string;
  classId: string;
  className: string;
  teacherName: string;
  scheduledAt: string;
  durationMinutes: number;
  price: number;
  notes?: string;
  recurringPattern?: 'none' | 'weekly' | 'biweekly' | 'monthly';
  recurringEndDate?: string;
}

export interface EnhancedStudentClassBookingProps {
  studentId: string;
  availableClasses: Array<{
    id: string;
    title: string;
    teacherId: string;
    teacherName: string;
    durationMinutes: number;
    price: number;
    availableSlots: Array<{
      id: string;
      startTime: string;
      endTime: string;
      isAvailable: boolean;
    }>;
  }>;
  onBookClass?: (bookingData: EnhancedBookingData) => Promise<boolean>;
  onConflictResolution?: (conflictId: string, resolution: any) => void;
  className?: string;
}

export function EnhancedStudentClassBooking({
  studentId,
  availableClasses,
  onBookClass,
  onConflictResolution,
  className,
}: EnhancedStudentClassBookingProps) {
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [bookingNotes, setBookingNotes] = useState('');
  const [recurringPattern, setRecurringPattern] = useState<'none' | 'weekly' | 'biweekly' | 'monthly'>('none');
  const [recurringEndDate, setRecurringEndDate] = useState('');
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize conflict detection
  const {
    conflicts,
    duplicates,
    hasErrors,
    hasWarnings,
    canProceed,
    isChecking,
    summary,
    checkBookingConflicts,
    clearConflicts,
    getSuggestedAlternatives,
  } = useConflictDetection({
    autoCheck: true,
    debounceMs: 500,
    onConflictsDetected: (conflicts, duplicates) => {
      console.log('Conflicts detected:', { conflicts, duplicates });
    },
    onErrorsChanged: (hasErrors) => {
      console.log('Error state changed:', hasErrors);
    },
  });

  // Clear conflicts when dialog closes
  useEffect(() => {
    if (!showBookingDialog) {
      clearConflicts();
    }
  }, [showBookingDialog, clearConflicts]);

  // Check conflicts when booking details change
  useEffect(() => {
    if (selectedClass && selectedSlot && selectedDate) {
      const scheduledAt = `${selectedDate}T${selectedSlot.startTime}:00`;
      
      checkBookingConflicts({
        studentId,
        teacherId: selectedClass.teacherId,
        classId: selectedClass.id,
        scheduledAt,
        durationMinutes: selectedClass.durationMinutes,
        recurringPattern,
        recurringEndDate: recurringPattern !== 'none' ? recurringEndDate : undefined,
      });
    }
  }, [
    selectedClass,
    selectedSlot,
    selectedDate,
    recurringPattern,
    recurringEndDate,
    studentId,
    checkBookingConflicts,
  ]);

  const handleClassSelection = (classItem: any, slot: any) => {
    setSelectedClass(classItem);
    setSelectedSlot(slot);
    setShowBookingDialog(true);
  };

  const handleBookingSubmit = async () => {
    if (!selectedClass || !selectedSlot || hasErrors) {
      return;
    }

    setIsProcessing(true);
    
    try {
      const bookingData: EnhancedBookingData = {
        studentId,
        teacherId: selectedClass.teacherId,
        classId: selectedClass.id,
        className: selectedClass.title,
        teacherName: selectedClass.teacherName,
        scheduledAt: `${selectedDate}T${selectedSlot.startTime}:00`,
        durationMinutes: selectedClass.durationMinutes,
        price: selectedClass.price,
        notes: bookingNotes,
        recurringPattern,
        recurringEndDate: recurringPattern !== 'none' ? recurringEndDate : undefined,
      };

      const success = await onBookClass?.(bookingData);
      
      if (success) {
        setShowBookingDialog(false);
        resetForm();
      }
    } catch (error) {
      console.error('Booking failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setSelectedClass(null);
    setSelectedSlot(null);
    setBookingNotes('');
    setRecurringPattern('none');
    setRecurringEndDate('');
    clearConflicts();
  };

  const handleConflictResolution = (conflictId: string, resolution: any) => {
    onConflictResolution?.(conflictId, resolution);
    
    // Handle specific resolution types
    switch (resolution.type) {
      case 'reschedule':
        // Close dialog and suggest rescheduling
        setShowBookingDialog(false);
        break;
      case 'override':
        // Allow booking despite warnings
        if (!hasErrors) {
          handleBookingSubmit();
        }
        break;
      case 'cancel':
        setShowBookingDialog(false);
        resetForm();
        break;
    }
  };

  const handleAcceptSuggestion = (suggestion: string) => {
    const suggestedDate = new Date(suggestion);
    setSelectedDate(format(suggestedDate, 'yyyy-MM-dd'));
    
    // Extract time and find matching slot
    const timeStr = format(suggestedDate, 'HH:mm');
    const matchingSlot = selectedClass?.availableSlots.find(
      (slot: any) => slot.startTime === timeStr
    );
    
    if (matchingSlot) {
      setSelectedSlot(matchingSlot);
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Available Classes */}
      <div className="grid gap-6">
        {availableClasses.map((classItem) => (
          <Card key={classItem.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{classItem.title}</CardTitle>
                  <p className="text-gray-600 text-sm">Teacher: {classItem.teacherName}</p>
                  <p className="text-gray-600 text-sm">Duration: {classItem.durationMinutes} minutes</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">${classItem.price}</div>
                  <div className="text-sm text-gray-500">per session</div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Available Time Slots:</Label>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                  {classItem.availableSlots.map((slot) => (
                    <Button
                      key={slot.id}
                      variant={slot.isAvailable ? "outline" : "ghost"}
                      disabled={!slot.isAvailable}
                      onClick={() => slot.isAvailable && handleClassSelection(classItem, slot)}
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
                        {slot.isAvailable ? 'Available' : 'Booked'}
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Enhanced Booking Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Book Class</DialogTitle>
            <DialogDescription>
              Review booking details and resolve any conflicts
            </DialogDescription>
          </DialogHeader>
          
          {selectedClass && selectedSlot && (
            <div className="space-y-6">
              {/* Booking Summary */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium mb-2">{selectedClass.title}</h4>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <div>Date: {format(new Date(selectedDate), 'MMM dd, yyyy')}</div>
                  <div>Time: {selectedSlot.startTime} - {selectedSlot.endTime}</div>
                  <div>Duration: {selectedClass.durationMinutes} minutes</div>
                  <div>Teacher: {selectedClass.teacherName}</div>
                </div>
                <div className="mt-2 text-lg font-medium text-blue-600">
                  Price: ${selectedClass.price}
                </div>
              </div>

              {/* Conflict Detection Status */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Booking Status</Label>
                  <div className="flex items-center gap-2">
                    {isChecking && (
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3 animate-spin" />
                        Checking...
                      </Badge>
                    )}
                    <ConflictIndicator
                      conflicts={conflicts}
                      duplicates={duplicates}
                      showDetails
                      size="sm"
                    />
                  </div>
                </div>

                {/* Conflict Warning System */}
                {(conflicts.length > 0 || duplicates.length > 0) && (
                  <ConflictWarningSystem
                    conflicts={conflicts}
                    duplicates={duplicates}
                    onResolveConflict={handleConflictResolution}
                    onAcceptSuggestion={handleAcceptSuggestion}
                  />
                )}
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="booking-date">Date</Label>
                  <Input
                    id="booking-date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any specific goals or notes for this class..."
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recurring">Recurring Pattern</Label>
                  <select
                    id="recurring"
                    value={recurringPattern}
                    onChange={(e) => setRecurringPattern(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="none">One-time booking</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                {recurringPattern !== 'none' && (
                  <div className="space-y-2">
                    <Label htmlFor="recurring-end">End Date for Recurring</Label>
                    <Input
                      id="recurring-end"
                      type="date"
                      value={recurringEndDate}
                      onChange={(e) => setRecurringEndDate(e.target.value)}
                      min={format(addDays(new Date(selectedDate), 7), 'yyyy-MM-dd')}
                    />
                  </div>
                )}
              </div>

              {/* Status Messages */}
              {hasErrors && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Please resolve the conflicts above before proceeding with the booking.
                  </AlertDescription>
                </Alert>
              )}

              {hasWarnings && !hasErrors && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    There are warnings for this booking. You can proceed, but please review them carefully.
                  </AlertDescription>
                </Alert>
              )}

              {canProceed && !hasErrors && !hasWarnings && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    No conflicts detected. Ready to book!
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowBookingDialog(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleBookingSubmit} 
              disabled={isProcessing || hasErrors || isChecking}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isProcessing ? 'Booking...' : 
               hasErrors ? 'Resolve Conflicts First' :
               hasWarnings ? 'Book with Warnings' :
               'Confirm Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}