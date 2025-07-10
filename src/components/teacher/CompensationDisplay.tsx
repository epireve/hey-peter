"use client";

import React, { useState, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import {
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  ChevronDown,
  Download,
  Info,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ClassEarning {
  id: string;
  className: string;
  date: Date;
  hours: number;
  amount: number;
  students: number;
}

interface BonusInfo {
  eligible: boolean;
  amount: number;
  criteria: string;
  currentValue: number;
}

interface PaymentRecord {
  id: string;
  date: Date;
  amount: number;
  status: 'paid' | 'pending' | 'processing';
  period: string;
}

interface CompensationData {
  weeklyEarnings: {
    totalAmount: number;
    totalHours: number;
    hourlyRate: number;
    classes: ClassEarning[];
  };
  monthlyEarnings: {
    totalAmount: number;
    totalHours: number;
    averageHourlyRate: number;
    projectedTotal: number;
    previousMonth: number;
    growthPercentage: number;
  };
  bonuses: {
    studentSatisfaction: BonusInfo;
    attendance: BonusInfo;
    extraHours: BonusInfo;
  };
  paymentHistory: PaymentRecord[];
}

interface CompensationDisplayProps {
  teacherId: string;
  compensationData?: CompensationData;
  isLoading?: boolean;
  error?: string;
  showChart?: boolean;
  showTaxInfo?: boolean;
  onDateRangeChange?: (range: { from: Date; to: Date }) => void;
  onExport?: (options: { format: string; data: any; dateRange: any }) => void;
  onRefresh?: () => void;
}

export function CompensationDisplay({
  teacherId,
  compensationData,
  isLoading = false,
  error,
  showChart = false,
  showTaxInfo = false,
  onDateRangeChange,
  onExport,
  onRefresh,
}: CompensationDisplayProps) {
  const [selectedView, setSelectedView] = useState<'weekly' | 'monthly'>('weekly');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    details: false,
    breakdown: false,
  });
  const [dateRange, setDateRange] = useState({
    from: startOfWeek(new Date()),
    to: endOfWeek(new Date()),
  });
  const [classFilter, setClassFilter] = useState<string>('all');

  const handleDateRangeSelect = (range: string) => {
    let from: Date, to: Date;
    const now = new Date();

    switch (range) {
      case 'thisWeek':
        from = startOfWeek(now);
        to = endOfWeek(now);
        break;
      case 'thisMonth':
        from = startOfMonth(now);
        to = endOfMonth(now);
        break;
      default:
        return;
    }

    setDateRange({ from, to });
    onDateRangeChange?.({ from, to });
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const formatCurrency = (amount: number) => {
    return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const filteredClasses = useMemo(() => {
    if (!compensationData?.weeklyEarnings.classes) return [];
    if (classFilter === 'all') return compensationData.weeklyEarnings.classes;
    return compensationData.weeklyEarnings.classes.filter(c => 
      c.className.toLowerCase().includes(classFilter.toLowerCase())
    );
  }, [compensationData?.weeklyEarnings.classes, classFilter]);

  const potentialTotal = useMemo(() => {
    if (!compensationData) return 0;
    const bonusTotal = Object.values(compensationData.bonuses).reduce(
      (sum, bonus) => sum + bonus.amount,
      0
    );
    return compensationData.monthlyEarnings.totalAmount + bonusTotal;
  }, [compensationData]);

  if (isLoading) {
    return (
      <div data-testid="compensation-loading" className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!compensationData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No compensation data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-2xl font-bold">Compensation Overview</h2>
          <div className="flex gap-2">
            <Select onValueChange={handleDateRangeSelect}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="thisWeek">This Week</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
              <span className="sr-only">Refresh</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => onExport?.({
                format: 'pdf',
                data: compensationData,
                dateRange,
              })}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Earnings Summary */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Weekly Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(compensationData.weeklyEarnings.totalAmount)}</div>
              <p className="text-xs text-muted-foreground">
                {compensationData.weeklyEarnings.totalHours} hours • {formatCurrency(compensationData.weeklyEarnings.hourlyRate)}/hour
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Earnings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(compensationData.monthlyEarnings.totalAmount)}</div>
              <div className="flex items-center text-xs">
                <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                <span className="text-green-600">+{compensationData.monthlyEarnings.growthPercentage}%</span>
                <span className="text-muted-foreground ml-1">from last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Projected Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(compensationData.monthlyEarnings.projectedTotal)}</div>
              <p className="text-xs text-muted-foreground">End of month estimate</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Potential Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(potentialTotal)}</div>
              <p className="text-xs text-muted-foreground">With all bonuses</p>
            </CardContent>
          </Card>
        </div>

        {/* View Toggle */}
        <Tabs value={selectedView} onValueChange={(v) => setSelectedView(v as 'weekly' | 'monthly')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Class Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Earnings Breakdown</CardTitle>
            <CardDescription>Detailed view of your classes and earnings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Collapsible open={expandedSections.details} onOpenChange={() => toggleSection('details')}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                      View Details
                      <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${expandedSections.details ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                </Collapsible>
                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger className="w-40">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    <SelectItem value="business">Business English</SelectItem>
                    <SelectItem value="basics">English Basics</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {expandedSections.details && (
                <div className="space-y-2 mt-4">
                  {filteredClasses.map((classItem) => (
                    <div key={classItem.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{classItem.className}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(classItem.date, 'MMM dd, yyyy')} • {classItem.hours} hours • {classItem.students} students
                        </p>
                      </div>
                      <p className="font-semibold">{formatCurrency(classItem.amount)}</p>
                    </div>
                  ))}
                </div>
              )}

              <Collapsible open={expandedSections.breakdown} onOpenChange={() => toggleSection('breakdown')}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    Rate Breakdown
                    <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${expandedSections.breakdown ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between">
                      <span>Base Rate</span>
                      <span>RM 500.00/hour</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Experience Bonus</span>
                      <span>RM 50.00/hour</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Qualification Bonus</span>
                      <span>RM 50.00/hour</span>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </CardContent>
        </Card>

        {/* Bonus Status */}
        <Card>
          <CardHeader>
            <CardTitle>Bonus Eligibility</CardTitle>
            <CardDescription>Track your progress towards monthly bonuses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(compensationData.bonuses).map(([key, bonus]) => {
              const title = key === 'studentSatisfaction' ? 'Student Satisfaction Bonus' :
                          key === 'attendance' ? 'Attendance Bonus' : 'Extra Hours Bonus';
              
              return (
                <div key={key} className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{title}</p>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{bonus.criteria}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {bonus.criteria} • Current: {bonus.currentValue}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(bonus.amount)}</p>
                      <Badge variant={bonus.eligible ? 'default' : 'secondary'}>
                        {bonus.eligible ? '✓ Eligible' : '✗ Not Eligible'}
                      </Badge>
                    </div>
                  </div>
                  <Progress 
                    value={bonus.eligible ? 100 : (bonus.currentValue / (key === 'extraHours' ? 20 : key === 'attendance' ? 95 : 4.5)) * 100} 
                    className="h-2"
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>Your recent salary payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {compensationData.paymentHistory.map((payment) => (
                <div key={payment.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{payment.period}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(payment.date, 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                    <Badge variant={payment.status === 'paid' ? 'default' : 'secondary'}>
                      {payment.status === 'paid' ? 'Paid' : payment.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Salary Status */}
        <Card>
          <CardHeader>
            <CardTitle>Salary Status</CardTitle>
            <CardDescription>Next payment information</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Next payment expected on</p>
            <p className="text-xl font-semibold">February 5, 2025</p>
          </CardContent>
        </Card>

        {/* Tax Information */}
        {showTaxInfo && (
          <Card>
            <CardHeader>
              <CardTitle>Tax Information</CardTitle>
              <CardDescription>Estimated tax deductions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Gross Income</span>
                  <span>{formatCurrency(compensationData.monthlyEarnings.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Tax</span>
                  <span className="text-red-600">-{formatCurrency(compensationData.monthlyEarnings.totalAmount * 0.15)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Net Income</span>
                  <span>{formatCurrency(compensationData.monthlyEarnings.totalAmount * 0.85)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Earnings Chart */}
        {showChart && (
          <Card>
            <CardHeader>
              <CardTitle>Earnings Trend</CardTitle>
              <CardDescription>Your earnings over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div data-testid="earnings-chart" className="h-64 flex items-center justify-center border-2 border-dashed">
                <p className="text-muted-foreground">Chart visualization would go here</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}