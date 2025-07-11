'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ManualAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStudent: string;
  onSubmit: (adjustmentData: any) => void;
}

export const ManualAdjustmentDialog: React.FC<ManualAdjustmentDialogProps> = ({
  open,
  onOpenChange,
  selectedStudent,
  onSubmit,
}) => {
  const [adjustmentType, setAdjustmentType] = useState('add');
  const [hours, setHours] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    onSubmit({
      studentId: selectedStudent,
      adjustmentType,
      hours: parseInt(hours),
      reason,
    });
    
    // Reset form
    setAdjustmentType('add');
    setHours('');
    setReason('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manual Hour Adjustment</DialogTitle>
          <DialogDescription>
            Add or subtract hours from a student's balance with a reason
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Student</Label>
            <Select value={selectedStudent}>
              <SelectTrigger>
                <SelectValue placeholder="Select a student" />
              </SelectTrigger>
              <SelectContent>
                {/* Student options would be mapped here */}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Adjustment Type</Label>
              <Select value={adjustmentType} onValueChange={setAdjustmentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add Hours</SelectItem>
                  <SelectItem value="subtract">Subtract Hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Hours</Label>
              <Input 
                type="number" 
                placeholder="0" 
                min="1"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea
              placeholder="Provide a detailed reason for this adjustment..."
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Submit Adjustment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};