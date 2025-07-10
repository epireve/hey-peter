"use client";

import React, { useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  CheckCircle,
  Clock,
  Users,
  Calendar,
  RefreshCw,
  Lightbulb,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { ConflictError, ConflictType } from '@/lib/services/conflict-detection-service';
import { DuplicateError, DuplicateType } from '@/lib/services/duplicate-prevention-service';

export interface ConflictWarningSystemProps {
  conflicts: ConflictError[];
  duplicates: DuplicateError[];
  onResolveConflict?: (conflictId: string, resolution: ConflictResolution) => void;
  onDismissWarning?: (warningId: string) => void;
  onAcceptSuggestion?: (suggestion: string) => void;
  showDismissedWarnings?: boolean;
  className?: string;
}

export interface ConflictResolution {
  type: 'reschedule' | 'override' | 'cancel' | 'modify';
  data?: Record<string, any>;
}

const SEVERITY_COLORS = {
  info: 'border-blue-200 bg-blue-50 text-blue-800',
  warning: 'border-yellow-200 bg-yellow-50 text-yellow-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  critical: 'border-red-600 bg-red-100 text-red-900',
};

const SEVERITY_ICONS = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  critical: AlertTriangle,
};

const CONFLICT_TYPE_ICONS: Record<ConflictType, React.ComponentType<any>> = {
  teacher_time_conflict: Users,
  student_time_conflict: Calendar,
  resource_conflict: AlertCircle,
  class_capacity_conflict: Users,
  duplicate_enrollment: RefreshCw,
  duplicate_class: RefreshCw,
  schedule_overlap: Clock,
};

const DUPLICATE_TYPE_ICONS: Record<DuplicateType, React.ComponentType<any>> = {
  duplicate_enrollment: RefreshCw,
  duplicate_class_same_time: Clock,
  duplicate_booking: Calendar,
  duplicate_recurring_booking: RefreshCw,
  duplicate_class_content: AlertCircle,
  duplicate_teacher_assignment: Users,
};

export function ConflictWarningSystem({
  conflicts,
  duplicates,
  onResolveConflict,
  onDismissWarning,
  onAcceptSuggestion,
  showDismissedWarnings = false,
  className,
}: ConflictWarningSystemProps) {
  const [dismissedWarnings, setDismissedWarnings] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const allIssues = [
    ...conflicts.map((conflict, index) => ({
      id: `conflict_${index}`,
      type: 'conflict' as const,
      data: conflict,
    })),
    ...duplicates.map((duplicate, index) => ({
      id: `duplicate_${index}`,
      type: 'duplicate' as const,
      data: duplicate,
    })),
  ];

  const visibleIssues = allIssues.filter(issue => 
    showDismissedWarnings || !dismissedWarnings.has(issue.id)
  );

  const errorCount = allIssues.filter(issue => 
    issue.data.severity === 'error' || issue.data.severity === 'critical'
  ).length;

  const warningCount = allIssues.filter(issue => 
    issue.data.severity === 'warning'
  ).length;

  const handleDismiss = (issueId: string) => {
    setDismissedWarnings(prev => new Set([...prev, issueId]));
    onDismissWarning?.(issueId);
  };

  const toggleExpanded = (issueId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(issueId)) {
        newSet.delete(issueId);
      } else {
        newSet.add(issueId);
      }
      return newSet;
    });
  };

  if (visibleIssues.length === 0) {
    return (
      <Card className={cn('border-green-200 bg-green-50', className)}>
        <CardContent className="flex items-center gap-3 p-4">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-green-800 font-medium">No conflicts detected</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary */}
      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Conflict Detection Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            {errorCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                {errorCount} Error{errorCount !== 1 ? 's' : ''}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800 border-yellow-300">
                <AlertTriangle className="h-3 w-3" />
                {warningCount} Warning{warningCount !== 1 ? 's' : ''}
              </Badge>
            )}
            <Badge variant="outline" className="gap-1">
              <Info className="h-3 w-3" />
              {visibleIssues.length} Total Issue{visibleIssues.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Issues List */}
      <div className="space-y-3">
        {visibleIssues.map((issue) => (
          <IssueCard
            key={issue.id}
            issue={issue}
            isExpanded={expandedItems.has(issue.id)}
            onToggleExpanded={() => toggleExpanded(issue.id)}
            onDismiss={() => handleDismiss(issue.id)}
            onResolveConflict={onResolveConflict}
            onAcceptSuggestion={onAcceptSuggestion}
            isDismissed={dismissedWarnings.has(issue.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface IssueCardProps {
  issue: {
    id: string;
    type: 'conflict' | 'duplicate';
    data: ConflictError | DuplicateError;
  };
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onDismiss: () => void;
  onResolveConflict?: (conflictId: string, resolution: ConflictResolution) => void;
  onAcceptSuggestion?: (suggestion: string) => void;
  isDismissed: boolean;
}

function IssueCard({
  issue,
  isExpanded,
  onToggleExpanded,
  onDismiss,
  onResolveConflict,
  onAcceptSuggestion,
  isDismissed,
}: IssueCardProps) {
  const { data } = issue;
  const SeverityIcon = SEVERITY_ICONS[data.severity];
  
  let TypeIcon: React.ComponentType<any>;
  if (issue.type === 'conflict') {
    TypeIcon = CONFLICT_TYPE_ICONS[(data as ConflictError).type];
  } else {
    TypeIcon = DUPLICATE_TYPE_ICONS[(data as DuplicateError).type];
  }

  const handleResolve = (resolution: ConflictResolution) => {
    onResolveConflict?.(issue.id, resolution);
  };

  return (
    <Card className={cn(
      'transition-all duration-200',
      SEVERITY_COLORS[data.severity],
      isDismissed && 'opacity-60'
    )}>
      <Collapsible open={isExpanded} onOpenChange={onToggleExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-black/5 transition-colors pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className="flex items-center gap-2 mt-0.5">
                  <SeverityIcon className="h-4 w-4" />
                  <TypeIcon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-sm font-medium mb-1">
                    {data.message}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {issue.type === 'conflict' ? (data as ConflictError).type : (data as DuplicateError).type}
                    </Badge>
                    <Badge 
                      variant={data.severity === 'error' || data.severity === 'critical' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {data.severity}
                    </Badge>
                    {!data.canProceed && (
                      <Badge variant="destructive" className="text-xs">
                        Blocks Proceed
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {data.severity === 'warning' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDismiss();
                    }}
                    className="h-6 w-6 p-0 hover:bg-black/10"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {/* Details */}
              <div className="space-y-2">
                {Object.entries(data.details).map(([key, value]) => {
                  if (!value || key === 'suggestedAlternatives') return null;
                  
                  return (
                    <div key={key} className="flex justify-between items-center text-sm">
                      <span className="font-medium capitalize">
                        {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                      </span>
                      <span className="text-right max-w-xs truncate">
                        {typeof value === 'string' ? value : JSON.stringify(value)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Suggested Actions */}
              {data.details.suggestedAction && (
                <Alert>
                  <Lightbulb className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Suggested Action:</strong> {data.details.suggestedAction}
                  </AlertDescription>
                </Alert>
              )}

              {/* Alternative Time Slots */}
              {issue.type === 'conflict' && (data as ConflictError).details.suggestedAlternatives && (
                <div className="space-y-2">
                  <span className="text-sm font-medium">Suggested Alternative Times:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(data as ConflictError).details.suggestedAlternatives!.map((suggestion, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => onAcceptSuggestion?.(suggestion)}
                        className="text-xs justify-start h-8"
                      >
                        <Clock className="h-3 w-3 mr-2" />
                        {new Date(suggestion).toLocaleString()}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Resolution Actions */}
              {issue.type === 'conflict' && !data.canProceed && (
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResolve({ type: 'reschedule' })}
                    className="text-xs"
                  >
                    <Calendar className="h-3 w-3 mr-1" />
                    Reschedule
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResolve({ type: 'modify' })}
                    className="text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Modify
                  </Button>
                  {data.severity === 'warning' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResolve({ type: 'override' })}
                      className="text-xs text-yellow-700 border-yellow-300 hover:bg-yellow-50"
                    >
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Override
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResolve({ type: 'cancel' })}
                    className="text-xs text-red-700 border-red-300 hover:bg-red-50"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              )}

              {/* Proceed with Warning */}
              {data.canProceed && data.severity === 'warning' && (
                <div className="flex justify-end pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onDismiss}
                    className="text-xs"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Acknowledge & Proceed
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

/**
 * Compact version for inline display
 */
export interface ConflictIndicatorProps {
  conflicts: ConflictError[];
  duplicates: DuplicateError[];
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  className?: string;
}

export function ConflictIndicator({
  conflicts,
  duplicates,
  size = 'md',
  showDetails = false,
  className,
}: ConflictIndicatorProps) {
  const allIssues = [...conflicts, ...duplicates];
  const errorCount = allIssues.filter(issue => 
    issue.severity === 'error' || issue.severity === 'critical'
  ).length;
  const warningCount = allIssues.filter(issue => 
    issue.severity === 'warning'
  ).length;

  if (allIssues.length === 0) {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <CheckCircle className={cn(
          'text-green-600',
          size === 'sm' && 'h-3 w-3',
          size === 'md' && 'h-4 w-4',
          size === 'lg' && 'h-5 w-5'
        )} />
        {showDetails && (
          <span className={cn(
            'text-green-600 font-medium',
            size === 'sm' && 'text-xs',
            size === 'md' && 'text-sm',
            size === 'lg' && 'text-base'
          )}>
            No conflicts
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {errorCount > 0 && (
        <div className="flex items-center gap-1">
          <AlertCircle className={cn(
            'text-red-600',
            size === 'sm' && 'h-3 w-3',
            size === 'md' && 'h-4 w-4',
            size === 'lg' && 'h-5 w-5'
          )} />
          {showDetails && (
            <span className={cn(
              'text-red-600 font-medium',
              size === 'sm' && 'text-xs',
              size === 'md' && 'text-sm',
              size === 'lg' && 'text-base'
            )}>
              {errorCount} Error{errorCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}
      
      {warningCount > 0 && (
        <div className="flex items-center gap-1">
          <AlertTriangle className={cn(
            'text-yellow-600',
            size === 'sm' && 'h-3 w-3',
            size === 'md' && 'h-4 w-4',
            size === 'lg' && 'h-5 w-5'
          )} />
          {showDetails && (
            <span className={cn(
              'text-yellow-600 font-medium',
              size === 'sm' && 'text-xs',
              size === 'md' && 'text-sm',
              size === 'lg' && 'text-base'
            )}>
              {warningCount} Warning{warningCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}
    </div>
  );
}