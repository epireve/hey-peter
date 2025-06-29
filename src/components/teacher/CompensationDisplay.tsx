'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DollarSign, TrendingUp, Clock, Calendar as CalendarIcon, Download, Gift, Star } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, parseISO, isWithinInterval } from 'date-fns';

interface CompensationDisplayProps {
  teacher: any;
  completedBookings: any[];
  compensationRecords: any[];
  bonusRecords: any[];
}

export function CompensationDisplay({ 
  teacher, 
  completedBookings, 
  compensationRecords, 
  bonusRecords 
}: CompensationDisplayProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('current-month');
  const [customDateRange, setCustomDateRange] = useState<{ from?: Date; to?: Date }>({});

  // Calculate earnings based on selected period
  const earnings = useMemo(() => {
    let filteredBookings = completedBookings;
    let periodStart = new Date();
    let periodEnd = new Date();

    switch (selectedPeriod) {
      case 'current-week':
        periodStart = startOfWeek(new Date());
        periodEnd = endOfWeek(new Date());
        break;
      case 'current-month':
        periodStart = startOfMonth(new Date());
        periodEnd = endOfMonth(new Date());
        break;
      case 'last-month':
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        periodStart = startOfMonth(lastMonth);
        periodEnd = endOfMonth(lastMonth);
        break;
      case 'custom':
        if (customDateRange.from && customDateRange.to) {
          periodStart = customDateRange.from;
          periodEnd = customDateRange.to;
        }
        break;
    }

    filteredBookings = completedBookings.filter(booking => {
      const bookingDate = parseISO(booking.start_time);
      return isWithinInterval(bookingDate, { start: periodStart, end: periodEnd });
    });

    // Calculate base earnings
    const baseEarnings = filteredBookings.reduce((sum, booking) => {
      const duration = booking.class?.course?.duration_minutes || 60;
      const hourlyRate = teacher.profile_data?.hourly_rate || 25;
      return sum + (duration / 60) * hourlyRate;
    }, 0);

    // Calculate bonuses for the period
    const periodBonuses = bonusRecords.filter(bonus => {
      const bonusDate = parseISO(bonus.awarded_date);
      return isWithinInterval(bonusDate, { start: periodStart, end: periodEnd });
    });

    const totalBonuses = periodBonuses.reduce((sum, bonus) => sum + bonus.amount, 0);

    // Group by course type for breakdown
    const courseTypeBreakdown = filteredBookings.reduce((acc, booking) => {
      const courseType = booking.class?.course?.course_type || 'other';
      const duration = booking.class?.course?.duration_minutes || 60;
      const hourlyRate = teacher.profile_data?.hourly_rate || 25;
      const earnings = (duration / 60) * hourlyRate;

      if (!acc[courseType]) {
        acc[courseType] = { hours: 0, earnings: 0, classes: 0 };
      }
      
      acc[courseType].hours += duration / 60;
      acc[courseType].earnings += earnings;
      acc[courseType].classes += 1;
      
      return acc;
    }, {});

    return {
      baseEarnings,
      totalBonuses,
      totalEarnings: baseEarnings + totalBonuses,
      totalHours: filteredBookings.reduce((sum, booking) => 
        sum + ((booking.class?.course?.duration_minutes || 60) / 60), 0
      ),
      totalClasses: filteredBookings.length,
      courseTypeBreakdown,
      periodBonuses,
      periodStart,
      periodEnd
    };
  }, [selectedPeriod, customDateRange, completedBookings, bonusRecords, teacher]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default">Paid</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'processing':
        return <Badge variant="outline">Processing</Badge>;
      default:
        return <Badge variant="destructive">Overdue</Badge>;
    }
  };

  const getBonusTypeBadge = (type: string) => {
    switch (type) {
      case 'performance':
        return <Badge variant="default" className="bg-blue-500"><Star className="h-3 w-3 mr-1" />Performance</Badge>;
      case 'attendance':
        return <Badge variant="default" className="bg-green-500"><Clock className="h-3 w-3 mr-1" />Attendance</Badge>;
      case 'retention':
        return <Badge variant="default" className="bg-purple-500"><TrendingUp className="h-3 w-3 mr-1" />Retention</Badge>;
      default:
        return <Badge variant="outline"><Gift className="h-3 w-3 mr-1" />Special</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Period Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Earnings Period</CardTitle>
              <CardDescription>Select time period to view earnings</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current-week">Current Week</SelectItem>
                  <SelectItem value="current-month">Current Month</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
              
              {selectedPeriod === 'custom' && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDateRange.from ? (
                        customDateRange.to ? (
                          <>
                            {format(customDateRange.from, "LLL dd")} -{" "}
                            {format(customDateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(customDateRange.from, "LLL dd, y")
                        )
                      ) : (
                        "Pick a date range"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      initialFocus
                      mode="range"
                      selected={customDateRange}
                      onSelect={setCustomDateRange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Earnings Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${earnings.totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {format(earnings.periodStart, 'MMM dd')} - {format(earnings.periodEnd, 'MMM dd')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Base Earnings</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${earnings.baseEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {earnings.totalHours.toFixed(1)} hours taught
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bonuses</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${earnings.totalBonuses.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {earnings.periodBonuses.length} bonus{earnings.periodBonuses.length !== 1 ? 'es' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Classes Taught</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{earnings.totalClasses}</div>
            <p className="text-xs text-muted-foreground">
              Completed classes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <Tabs defaultValue="breakdown" className="space-y-4">
        <TabsList>
          <TabsTrigger value="breakdown">Earnings Breakdown</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
          <TabsTrigger value="bonuses">Bonuses</TabsTrigger>
        </TabsList>

        <TabsContent value="breakdown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Course Type Breakdown</CardTitle>
              <CardDescription>
                Earnings breakdown by course type for the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(earnings.courseTypeBreakdown).map(([courseType, data]: [string, any]) => (
                  <div key={courseType} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium capitalize">{courseType.replace('_', ' ')}</h3>
                      <div className="text-sm text-muted-foreground">
                        {data.classes} classes • {data.hours.toFixed(1)} hours
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">${data.earnings.toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">
                        ${(data.earnings / data.hours).toFixed(2)}/hr
                      </div>
                    </div>
                  </div>
                ))}
                
                {Object.keys(earnings.courseTypeBreakdown).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No earnings in this period</h3>
                    <p>No completed classes found for the selected time period.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Payment History</CardTitle>
                  <CardDescription>
                    Your payment records and status
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {compensationRecords.length > 0 ? (
                  compensationRecords.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">
                          {format(parseISO(payment.period_start), 'MMM dd')} - {format(parseISO(payment.period_end), 'MMM dd, yyyy')}
                        </h3>
                        <div className="text-sm text-muted-foreground">
                          {payment.hours_taught} hours • {payment.classes_taught} classes
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold">${payment.total_amount.toFixed(2)}</div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(payment.status)}
                          {payment.paid_date && (
                            <span className="text-xs text-muted-foreground">
                              Paid {format(parseISO(payment.paid_date), 'MMM dd')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No payment records</h3>
                    <p>Payment history will appear here once payments are processed.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bonuses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bonus History</CardTitle>
              <CardDescription>
                Performance bonuses and special rewards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bonusRecords.length > 0 ? (
                  bonusRecords.map((bonus) => (
                    <div key={bonus.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{bonus.title}</h3>
                          {getBonusTypeBadge(bonus.bonus_type)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {bonus.description}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Awarded on {format(parseISO(bonus.awarded_date), 'MMM dd, yyyy')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-green-600">
                          +${bonus.amount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No bonuses yet</h3>
                    <p>Keep up the great work to earn performance bonuses!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}