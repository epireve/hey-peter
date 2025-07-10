'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  Alert, 
  AlertDescription, 
  AlertTitle 
} from '@/components/ui/alert';
import { 
  Users, 
  Clock, 
  Plus, 
  Minus, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  ArrowUp,
  ArrowDown,
  UserCheck,
  UserX,
  Split,
  Copy
} from 'lucide-react';
import { 
  classCapacityService, 
  ClassCapacityInfo, 
  WaitingListEntry, 
  ClassSplitRecommendation 
} from '@/lib/services/class-capacity-service';
import { 
  ENROLLMENT_STATUS_COLORS, 
  ENROLLMENT_STATUS_LABELS,
  CLASS_CAPACITY 
} from '@/lib/constants';

interface ClassCapacityManagementProps {
  classId: string;
  teacherId?: string;
  onCapacityChange?: (classId: string, newCapacity: ClassCapacityInfo) => void;
}

export default function ClassCapacityManagement({ 
  classId, 
  teacherId, 
  onCapacityChange 
}: ClassCapacityManagementProps) {
  const [capacity, setCapacity] = useState<ClassCapacityInfo | null>(null);
  const [waitingList, setWaitingList] = useState<WaitingListEntry[]>([]);
  const [recommendations, setRecommendations] = useState<ClassSplitRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [enrollmentDialogOpen, setEnrollmentDialogOpen] = useState(false);

  useEffect(() => {
    loadClassCapacity();
    loadWaitingList();
    loadRecommendations();
  }, [classId]);

  const loadClassCapacity = async () => {
    try {
      const capacityData = await classCapacityService.getClassCapacity(classId);
      setCapacity(capacityData);
      onCapacityChange?.(classId, capacityData!);
    } catch (err) {
      setError('Failed to load class capacity');
    }
  };

  const loadWaitingList = async () => {
    try {
      const list = await classCapacityService.getWaitingList(classId);
      setWaitingList(list);
    } catch (err) {
      setError('Failed to load waiting list');
    }
  };

  const loadRecommendations = async () => {
    try {
      const recs = await classCapacityService.getClassesThatNeedAttention();
      setRecommendations(recs.filter(r => r.class_id === classId));
    } catch (err) {
      console.error('Failed to load recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollStudent = async () => {
    if (!selectedStudentId) return;

    setIsEnrolling(true);
    try {
      const result = await classCapacityService.enrollStudent(classId, selectedStudentId);
      
      if (result.success) {
        await loadClassCapacity();
        await loadWaitingList();
        setEnrollmentDialogOpen(false);
        setSelectedStudentId('');
        
        if (result.waitlisted) {
          setError(`Student added to waiting list at position ${result.position}`);
        } else {
          setError(null);
        }
      } else {
        setError(result.error || 'Failed to enroll student');
      }
    } catch (err) {
      setError('Failed to enroll student');
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleDropStudent = async (studentId: string) => {
    try {
      const result = await classCapacityService.dropStudent(classId, studentId);
      
      if (result.success) {
        await loadClassCapacity();
        await loadWaitingList();
        
        if (result.promoted_from_waitlist) {
          setError('Student dropped and waitlisted student promoted');
        } else {
          setError(null);
        }
      } else {
        setError(result.error || 'Failed to drop student');
      }
    } catch (err) {
      setError('Failed to drop student');
    }
  };

  const handleCreateOverflowClass = async () => {
    try {
      const result = await classCapacityService.createOverflowClass(classId);
      
      if (result.success) {
        setError(`New overflow class created: ${result.new_class_id}`);
        await loadRecommendations();
      } else {
        setError(result.error || 'Failed to create overflow class');
      }
    } catch (err) {
      setError('Failed to create overflow class');
    }
  };

  const getCapacityColor = (utilization: number) => {
    if (utilization >= 100) return 'bg-red-500';
    if (utilization >= 85) return 'bg-orange-500';
    if (utilization >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getCapacityStatus = (info: ClassCapacityInfo) => {
    if (info.is_full) return { text: 'Full', color: 'bg-red-100 text-red-800' };
    if (info.capacity_utilization >= 85) return { text: 'Nearly Full', color: 'bg-orange-100 text-orange-800' };
    if (info.capacity_utilization >= 70) return { text: 'High', color: 'bg-yellow-100 text-yellow-800' };
    return { text: 'Available', color: 'bg-green-100 text-green-800' };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Class Capacity Management</CardTitle>
          <CardDescription>Managing class enrollment and capacity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!capacity) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Class Capacity Management</CardTitle>
          <CardDescription>Managing class enrollment and capacity</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Unable to load class capacity information.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const status = getCapacityStatus(capacity);

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert variant={error.includes('success') ? 'default' : 'destructive'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {error.includes('success') ? 'Success' : 'Error'}
          </AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Capacity Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Class Capacity Overview
          </CardTitle>
          <CardDescription>
            Current enrollment and capacity information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {capacity.current_enrolled}
              </div>
              <div className="text-sm text-gray-600">Enrolled</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {capacity.available_spots}
              </div>
              <div className="text-sm text-gray-600">Available</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {capacity.waiting_list_count}
              </div>
              <div className="text-sm text-gray-600">Waitlisted</div>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Capacity Utilization</span>
              <Badge className={status.color}>{status.text}</Badge>
            </div>
            <Progress 
              value={capacity.capacity_utilization} 
              className="h-2"
              style={{
                background: `linear-gradient(to right, ${getCapacityColor(capacity.capacity_utilization)} 0%, ${getCapacityColor(capacity.capacity_utilization)} ${capacity.capacity_utilization}%, #e5e7eb ${capacity.capacity_utilization}%)`
              }}
            />
            <div className="text-sm text-gray-600 mt-1">
              {capacity.capacity_utilization}% ({capacity.current_enrolled}/{capacity.max_capacity})
            </div>
          </div>

          <div className="flex gap-2">
            <Dialog open={enrollmentDialogOpen} onOpenChange={setEnrollmentDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={!capacity.can_accept_waitlist && capacity.is_full}>
                  <Plus className="h-4 w-4 mr-2" />
                  Enroll Student
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Enroll Student</DialogTitle>
                  <DialogDescription>
                    Add a student to this class or waiting list
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="student-id">Student ID</Label>
                    <Input
                      id="student-id"
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      placeholder="Enter student ID"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleEnrollStudent}
                      disabled={isEnrolling || !selectedStudentId}
                    >
                      {isEnrolling ? 'Enrolling...' : 'Enroll'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setEnrollmentDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {recommendations.length > 0 && (
              <Button 
                variant="outline" 
                onClick={handleCreateOverflowClass}
                className="text-orange-600"
              >
                <Copy className="h-4 w-4 mr-2" />
                Create Overflow Class
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Waiting List */}
      {waitingList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Waiting List ({waitingList.length})
            </CardTitle>
            <CardDescription>
              Students waiting for enrollment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Position</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waitingList.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      #{entry.position}
                    </TableCell>
                    <TableCell>{entry.student_name}</TableCell>
                    <TableCell>{entry.student_email}</TableCell>
                    <TableCell>
                      {new Date(entry.enrolled_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDropStudent(entry.student_id)}
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                        {entry.position === 1 && capacity.available_spots > 0 && (
                          <Button 
                            size="sm"
                            onClick={() => classCapacityService.promoteFromWaitlist(classId)}
                          >
                            <UserCheck className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Capacity Recommendations
            </CardTitle>
            <CardDescription>
              Suggested actions for class capacity optimization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendations.map((rec) => (
                <Alert key={rec.class_id}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>
                    {rec.priority === 'high' ? 'High Priority' : 'Medium Priority'}
                  </AlertTitle>
                  <AlertDescription>
                    <div className="mt-2">
                      <p><strong>Current Enrollment:</strong> {rec.current_enrollment}</p>
                      <p><strong>Reason:</strong> {rec.reason}</p>
                      <p><strong>Recommended Action:</strong> {rec.recommended_action}</p>
                    </div>
                    <div className="mt-4 flex gap-2">
                      {rec.recommended_action === 'split' && (
                        <Button size="sm" variant="outline">
                          <Split className="h-4 w-4 mr-2" />
                          Split Class
                        </Button>
                      )}
                      {rec.recommended_action === 'create_new' && (
                        <Button size="sm" variant="outline">
                          <Copy className="h-4 w-4 mr-2" />
                          Create New Class
                        </Button>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}