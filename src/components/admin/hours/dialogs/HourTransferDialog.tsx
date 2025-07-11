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

interface HourTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (transferData: any) => void;
}

export const HourTransferDialog: React.FC<HourTransferDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
}) => {
  const [fromStudent, setFromStudent] = useState('');
  const [toStudent, setToStudent] = useState('');
  const [hours, setHours] = useState('');
  const [relationship, setRelationship] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    onSubmit({
      fromStudent,
      toStudent,
      hours: parseInt(hours),
      relationship,
      reason,
    });
    
    // Reset form
    setFromStudent('');
    setToStudent('');
    setHours('');
    setRelationship('');
    setReason('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer Hours</DialogTitle>
          <DialogDescription>
            Transfer hours between students (family accounts)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>From Student</Label>
              <Select value={fromStudent} onValueChange={setFromStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {/* Student options */}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>To Student</Label>
              <Select value={toStudent} onValueChange={setToStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {/* Student options */}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Hours to Transfer</Label>
            <Input 
              type="number" 
              placeholder="0" 
              min="1"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Relationship</Label>
            <Select value={relationship} onValueChange={setRelationship}>
              <SelectTrigger>
                <SelectValue placeholder="Select relationship" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="parent-child">Parent-Child</SelectItem>
                <SelectItem value="siblings">Siblings</SelectItem>
                <SelectItem value="spouse">Spouse</SelectItem>
                <SelectItem value="other">Other Family</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea
              placeholder="Reason for transfer..."
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Transfer Hours</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};