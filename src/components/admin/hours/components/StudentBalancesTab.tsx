'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, RefreshCw } from 'lucide-react';

interface StudentBalancesTabProps {
  selectedStudent: string;
  onSelectedStudentChange: (student: string) => void;
  onAdjustmentDialogOpen: () => void;
  onTransferDialogOpen: () => void;
}

export const StudentBalancesTab: React.FC<StudentBalancesTabProps> = ({
  selectedStudent,
  onSelectedStudentChange,
  onAdjustmentDialogOpen,
  onTransferDialogOpen,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Student Hour Balances</h3>
        <div className="flex gap-2">
          <Input
            placeholder="Search students..."
            className="w-64"
          />
          <Button onClick={onAdjustmentDialogOpen}>
            <Plus className="h-4 w-4 mr-2" />
            Manual Adjustment
          </Button>
          <Button variant="outline" onClick={onTransferDialogOpen}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Transfer Hours
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Total Hours</TableHead>
                <TableHead>Active Packages</TableHead>
                <TableHead>Next Expiry</TableHead>
                <TableHead>Alerts</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No student balances found
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};