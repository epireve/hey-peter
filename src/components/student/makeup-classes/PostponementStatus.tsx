'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clock, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Hourglass,
  BookOpen,
  User,
  MapPin,
  RefreshCw,
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { autoPostponementService, type ClassPostponement, type MakeUpClass } from '@/lib/services/auto-postponement-service';
import { MakeUpClassSelector } from './MakeUpClassSelector';

interface PostponementStatusProps {
  studentId: string;
  onMakeUpSelected?: (postponementId: string) => void;
}

interface PostponementWithMakeUp extends ClassPostponement {
  make_up_class?: MakeUpClass;
  original_class_name?: string;
  teacher_name?: string;
  leave_reason?: string;
}

export function PostponementStatus({ studentId, onMakeUpSelected }: PostponementStatusProps) {
  const [postponements, setPostponements] = useState<PostponementWithMakeUp[]>([]);
  const [makeUpClasses, setMakeUpClasses] = useState<MakeUpClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPostponement, setSelectedPostponement] = useState<string | null>(null);

  useEffect(() => {
    loadPostponements();
  }, [studentId]);

  const loadPostponements = async () => {
    try {
      setLoading(true);
      setError(null);

      const [postponementsData, makeUpData] = await Promise.all([
        autoPostponementService.getStudentPostponements(studentId),
        autoPostponementService.getStudentMakeUpClasses(studentId)
      ]);

      // Combine postponements with make-up class data
      const enrichedPostponements = postponementsData.map(postponement => {
        const makeUpClass = makeUpData.find(muc => muc.postponement_id === postponement.id);
        return {
          ...postponement,
          make_up_class: makeUpClass,
        };
      });

      setPostponements(enrichedPostponements);
      setMakeUpClasses(makeUpData);
    } catch (error) {
      console.error('Error loading postponements:', error);
      setError(error instanceof Error ? error.message : 'Failed to load postponements');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'make_up_scheduled':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Hourglass className="h-4 w-4" />;
      case 'confirmed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'make_up_scheduled':
        return <Calendar className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getMakeUpStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'suggested':
        return 'bg-blue-100 text-blue-800';
      case 'student_selected':
        return 'bg-purple-100 text-purple-800';
      case 'admin_approved':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const canSelectMakeUp = (postponement: PostponementWithMakeUp) => {
    return postponement.status === 'pending' || 
           (postponement.make_up_class?.status === 'suggested' && !postponement.make_up_class?.student_selected);
  };

  const getNextAction = (postponement: PostponementWithMakeUp) => {
    if (!postponement.make_up_class) {
      return 'Waiting for make-up suggestions';
    }

    switch (postponement.make_up_class.status) {
      case 'suggested':
        return 'Select your preferred make-up class';
      case 'student_selected':
        return 'Waiting for admin approval';
      case 'admin_approved':
        return 'Make-up class approved - check your schedule';
      case 'scheduled':
        return 'Make-up class scheduled';
      case 'rejected':
        return 'Make-up class rejected - contact support';
      case 'expired':
        return 'Selection expired - contact support';
      default:
        return 'Processing...';
    }
  };

  const handleMakeUpSelection = (postponementId: string) => {
    setSelectedPostponement(postponementId);
  };

  const handleSelectionComplete = () => {
    setSelectedPostponement(null);
    loadPostponements(); // Refresh data
    onMakeUpSelected?.(selectedPostponement!);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading postponement status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (selectedPostponement) {
    return (
      <MakeUpClassSelector
        studentId={studentId}
        postponementId={selectedPostponement}
        onSelectionComplete={handleSelectionComplete}
        onClose={() => setSelectedPostponement(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Postponed Classes</h2>
          <p className="text-gray-600 mt-1">
            Track your postponed classes and select make-up options
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={loadPostponements}
          disabled={loading}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {postponements.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No Postponed Classes</p>
              <p>You don't have any postponed classes at the moment.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active">Active ({postponements.filter(p => p.status !== 'completed' && p.status !== 'cancelled').length})</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {postponements
                  .filter(p => p.status !== 'completed' && p.status !== 'cancelled')
                  .map((postponement) => (
                    <PostponementCard
                      key={postponement.id}
                      postponement={postponement}
                      onSelectMakeUp={handleMakeUpSelection}
                      canSelectMakeUp={canSelectMakeUp(postponement)}
                      nextAction={getNextAction(postponement)}
                    />
                  ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="completed">
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {postponements
                  .filter(p => p.status === 'completed' || p.status === 'cancelled')
                  .map((postponement) => (
                    <PostponementCard
                      key={postponement.id}
                      postponement={postponement}
                      onSelectMakeUp={handleMakeUpSelection}
                      canSelectMakeUp={false}
                      nextAction={getNextAction(postponement)}
                    />
                  ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="all">
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {postponements.map((postponement) => (
                  <PostponementCard
                    key={postponement.id}
                    postponement={postponement}
                    onSelectMakeUp={handleMakeUpSelection}
                    canSelectMakeUp={canSelectMakeUp(postponement)}
                    nextAction={getNextAction(postponement)}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

interface PostponementCardProps {
  postponement: PostponementWithMakeUp;
  onSelectMakeUp: (postponementId: string) => void;
  canSelectMakeUp: boolean;
  nextAction: string;
}

function PostponementCard({ 
  postponement, 
  onSelectMakeUp, 
  canSelectMakeUp, 
  nextAction 
}: PostponementCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'make_up_scheduled':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Hourglass className="h-4 w-4" />;
      case 'confirmed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'make_up_scheduled':
        return <Calendar className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getMakeUpStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'suggested':
        return 'bg-blue-100 text-blue-800';
      case 'student_selected':
        return 'bg-purple-100 text-purple-800';
      case 'admin_approved':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className={cn("text-xs", getStatusColor(postponement.status))}>
                {getStatusIcon(postponement.status)}
                {postponement.status.replace('_', ' ')}
              </Badge>
              {postponement.make_up_class && (
                <Badge variant="secondary" className={cn("text-xs", getMakeUpStatusColor(postponement.make_up_class.status))}>
                  Make-up: {postponement.make_up_class.status.replace('_', ' ')}
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg">
              {postponement.original_class_name || 'Class Name'}
            </CardTitle>
            <p className="text-gray-600 text-sm mt-1">
              Originally scheduled for {formatDateTime(postponement.original_start_time)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">
              {postponement.hours_affected} hours affected
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Teacher</span>
              </div>
              <p className="text-gray-600 ml-6">{postponement.teacher_name || 'TBD'}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Reason</span>
              </div>
              <p className="text-gray-600 ml-6">
                {postponement.postponement_reason.replace('_', ' ')}
              </p>
            </div>
          </div>

          {postponement.make_up_class && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Make-up Class Status</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Compatibility Score:</span>
                  <span className="font-medium">
                    {Math.round((postponement.make_up_class.compatibility_score || 0) * 100)}%
                  </span>
                </div>
                <Progress 
                  value={(postponement.make_up_class.compatibility_score || 0) * 100} 
                  className="h-2"
                />
                {postponement.make_up_class.selection_deadline && (
                  <div className="flex items-center gap-2 text-amber-600">
                    <Bell className="h-4 w-4" />
                    <span>
                      Selection deadline: {formatDateTime(postponement.make_up_class.selection_deadline)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Next Action</h4>
            <p className="text-sm text-gray-600 mb-3">{nextAction}</p>
            
            {canSelectMakeUp && (
              <Button 
                onClick={() => onSelectMakeUp(postponement.id!)}
                size="sm"
                className="w-full"
              >
                Select Make-up Class
              </Button>
            )}
          </div>

          {postponement.notes && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Notes:</span> {postponement.notes}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}