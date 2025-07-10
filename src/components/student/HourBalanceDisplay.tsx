'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  TrendingUp, 
  Calendar, 
  AlertTriangle,
  Plus,
  History,
  Eye
} from 'lucide-react';
import { hourTrackingService } from '@/lib/services';
import { StudentHourSummary } from '@/types/hour-management';

interface HourBalanceDisplayProps {
  studentId: string;
  onPurchaseHours?: () => void;
  onViewHistory?: () => void;
  compact?: boolean;
}

export function HourBalanceDisplay({ 
  studentId, 
  onPurchaseHours, 
  onViewHistory,
  compact = false 
}: HourBalanceDisplayProps) {
  const [summary, setSummary] = useState<StudentHourSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHourSummary();
  }, [studentId]);

  const loadHourSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await hourTrackingService.getStudentHourSummary(studentId);
      
      if (response.success && response.data) {
        setSummary(response.data);
      } else {
        setError(response.error || 'Failed to load hour summary');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error loading hour summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatHours = (hours: number) => {
    return hours.toFixed(1);
  };

  const getBalanceStatus = (balance: number) => {
    if (balance <= 0) return { variant: 'destructive' as const, text: 'No Hours' };
    if (balance <= 5) return { variant: 'secondary' as const, text: 'Low Balance' };
    return { variant: 'default' as const, text: 'Active' };
  };

  const calculateUsagePercentage = (used: number, purchased: number) => {
    if (purchased === 0) return 0;
    return Math.min((used / purchased) * 100, 100);
  };

  if (loading) {
    return (
      <Card className={compact ? 'w-full' : ''}>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
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

  if (!summary) {
    return null;
  }

  const balanceStatus = getBalanceStatus(summary.current_balance);
  const usagePercentage = calculateUsagePercentage(summary.total_hours_used, summary.total_hours_purchased);
  const isLowBalance = summary.current_balance <= 5;
  const hasExpiringHours = summary.hours_expiring_soon > 0;

  if (compact) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Hour Balance</p>
                <p className="text-lg font-bold">{formatHours(summary.current_balance)} hours</p>
              </div>
            </div>
            <Badge variant={balanceStatus.variant}>{balanceStatus.text}</Badge>
          </div>
          
          {(isLowBalance || hasExpiringHours) && (
            <div className="mt-3 space-y-2">
              {isLowBalance && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>Low hour balance! Consider purchasing more hours.</AlertDescription>
                </Alert>
              )}
              {hasExpiringHours && (
                <Alert>
                  <Calendar className="h-4 w-4" />
                  <AlertDescription>
                    {formatHours(summary.hours_expiring_soon)} hours expiring soon
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <Clock className="h-5 w-5 mr-2 text-blue-500" />
            Hour Balance
          </span>
          <Badge variant={balanceStatus.variant}>{balanceStatus.text}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Balance */}
        <div className="text-center">
          <p className="text-3xl font-bold text-blue-600">
            {formatHours(summary.current_balance)}
          </p>
          <p className="text-sm text-gray-500">hours remaining</p>
        </div>

        {/* Usage Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Hours Used</span>
            <span>{summary.total_hours_used} / {summary.total_hours_purchased}</span>
          </div>
          <Progress value={usagePercentage} className="h-2" />
          <p className="text-xs text-gray-500 text-center">
            {usagePercentage.toFixed(1)}% of purchased hours used
          </p>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-sm font-medium">Purchased</span>
            </div>
            <p className="text-lg font-semibold">{summary.total_hours_purchased}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Clock className="h-4 w-4 text-orange-500 mr-1" />
              <span className="text-sm font-medium">Used</span>
            </div>
            <p className="text-lg font-semibold">{summary.total_hours_used}</p>
          </div>
        </div>

        {/* Warnings */}
        {(isLowBalance || hasExpiringHours) && (
          <div className="space-y-3 pt-4 border-t">
            {isLowBalance && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Your hour balance is low! Consider purchasing more hours to continue your classes.
                </AlertDescription>
              </Alert>
            )}
            {hasExpiringHours && (
              <Alert>
                <Calendar className="h-4 w-4" />
                <AlertDescription>
                  You have {formatHours(summary.hours_expiring_soon)} hours expiring soon.
                  {summary.next_expiration_date && (
                    <span className="block text-xs mt-1">
                      Next expiration: {new Date(summary.next_expiration_date).toLocaleDateString()}
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-4">
          {onPurchaseHours && (
            <Button onClick={onPurchaseHours} className="flex-1">
              <Plus className="h-4 w-4 mr-2" />
              Purchase Hours
            </Button>
          )}
          {onViewHistory && (
            <Button variant="outline" onClick={onViewHistory} className="flex-1">
              <History className="h-4 w-4 mr-2" />
              View History
            </Button>
          )}
        </div>

        {/* Last Activity */}
        {summary.last_transaction_date && (
          <div className="text-xs text-gray-500 text-center pt-2 border-t">
            Last activity: {new Date(summary.last_transaction_date).toLocaleDateString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default HourBalanceDisplay;