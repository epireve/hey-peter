'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  Bell, 
  BellOff, 
  AlertCircle, 
  Calendar, 
  Target, 
  TrendingUp,
  TrendingDown,
  Activity,
  Settings,
  Filter
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { hourUsageAnalyticsService } from '@/lib/services/hour-usage-analytics-service';
import { hourManagementService } from '@/lib/services/hour-management-service';
import type { LowBalanceAlert, HourAlert } from '@/types/hours';

interface AlertManagerProps {
  studentId?: string;
  className?: string;
}

export function AlertManager({ studentId, className }: AlertManagerProps) {
  const [alerts, setAlerts] = useState<LowBalanceAlert[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<HourAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<LowBalanceAlert | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('urgency');
  const [showSettings, setShowSettings] = useState(false);

  // Alert settings
  const [alertSettings, setAlertSettings] = useState({
    lowBalanceThreshold: 5,
    criticalBalanceThreshold: 2,
    expiryWarningDays: 30,
    autoNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
    notificationFrequency: 'daily'
  });

  useEffect(() => {
    loadAlerts();
  }, [studentId]);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError(null);

      const [alertsResult, activeAlertsResult] = await Promise.all([
        hourUsageAnalyticsService.generateLowBalanceAlerts(
          studentId,
          alertSettings.lowBalanceThreshold
        ),
        hourManagementService.getActiveAlerts()
      ]);

      if (alertsResult.success) {
        setAlerts(alertsResult.data);
        if (alertsResult.data.length > 0) {
          setSelectedAlert(alertsResult.data[0]);
        }
      } else {
        throw new Error(alertsResult.error?.message || 'Failed to load alerts');
      }

      if (activeAlertsResult.success) {
        setActiveAlerts(activeAlertsResult.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      // Update the alert in the local state
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, acknowledgedAt: new Date().toISOString() }
          : alert
      ));
      
      // In a real implementation, this would make an API call
      // await hourUsageAnalyticsService.acknowledgeAlert(alertId);
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  const generateReport = async () => {
    try {
      const report = await hourUsageAnalyticsService.generateUsageReport(
        'predictive',
        30,
        studentId ? { studentIds: [studentId] } : undefined
      );
      
      if (report.success) {
        // Handle report generation
        console.log('Report generated:', report.data);
      }
    } catch (err) {
      console.error('Failed to generate report:', err);
    }
  };

  const formatHours = (hours: number) => {
    return hours.toFixed(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'medium':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <Activity className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getUrgencyColor = (urgency: number) => {
    if (urgency >= 8) return 'bg-red-500';
    if (urgency >= 6) return 'bg-orange-500';
    if (urgency >= 4) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filterSeverity !== 'all' && alert.severity !== filterSeverity) return false;
    if (filterStatus !== 'all') {
      if (filterStatus === 'acknowledged' && !alert.acknowledgedAt) return false;
      if (filterStatus === 'unacknowledged' && alert.acknowledgedAt) return false;
    }
    return true;
  });

  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    switch (sortBy) {
      case 'urgency':
        return b.urgencyLevel - a.urgencyLevel;
      case 'severity':
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      case 'date':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'balance':
        return a.currentBalance - b.currentBalance;
      default:
        return 0;
    }
  });

  const generateAlertChartData = () => {
    const severityCount = alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(severityCount).map(([severity, count]) => ({
      severity,
      count,
      fill: severity === 'critical' ? '#ef4444' : 
            severity === 'high' ? '#f97316' :
            severity === 'medium' ? '#eab308' : '#3b82f6'
    }));
  };

  const generateTrendData = () => {
    // Mock trend data - in real implementation, this would come from historical data
    return [
      { date: '2024-01-01', alerts: 2 },
      { date: '2024-01-02', alerts: 3 },
      { date: '2024-01-03', alerts: 1 },
      { date: '2024-01-04', alerts: 4 },
      { date: '2024-01-05', alerts: 2 },
      { date: '2024-01-06', alerts: 5 },
      { date: '2024-01-07', alerts: 3 }
    ];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading alerts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-600">{error}</p>
          <Button onClick={loadAlerts} variant="outline" size="sm" className="mt-2">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Alert Management</h1>
          <p className="text-gray-600">Monitor and manage hour balance alerts</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setShowSettings(!showSettings)} variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-1" />
            Settings
          </Button>
          <Button onClick={generateReport} variant="outline" size="sm">
            Generate Report
          </Button>
          <Button onClick={loadAlerts} size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <Bell className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alerts.length}</div>
            <p className="text-xs text-gray-600">Active notifications</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {alerts.filter(a => a.severity === 'critical').length}
            </div>
            <p className="text-xs text-gray-600">Immediate action needed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {alerts.filter(a => a.severity === 'high').length}
            </div>
            <p className="text-xs text-gray-600">Action required soon</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acknowledged</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {alerts.filter(a => a.acknowledgedAt).length}
            </div>
            <p className="text-xs text-gray-600">Reviewed alerts</p>
          </CardContent>
        </Card>
      </div>

      {/* Alert Settings */}
      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle>Alert Settings</CardTitle>
            <CardDescription>Configure alert thresholds and notification preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="lowBalanceThreshold">Low Balance Threshold (hours)</Label>
                  <Input
                    id="lowBalanceThreshold"
                    type="number"
                    value={alertSettings.lowBalanceThreshold}
                    onChange={(e) => setAlertSettings(prev => ({
                      ...prev,
                      lowBalanceThreshold: parseInt(e.target.value)
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="criticalBalanceThreshold">Critical Balance Threshold (hours)</Label>
                  <Input
                    id="criticalBalanceThreshold"
                    type="number"
                    value={alertSettings.criticalBalanceThreshold}
                    onChange={(e) => setAlertSettings(prev => ({
                      ...prev,
                      criticalBalanceThreshold: parseInt(e.target.value)
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="expiryWarningDays">Expiry Warning (days)</Label>
                  <Input
                    id="expiryWarningDays"
                    type="number"
                    value={alertSettings.expiryWarningDays}
                    onChange={(e) => setAlertSettings(prev => ({
                      ...prev,
                      expiryWarningDays: parseInt(e.target.value)
                    }))}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="autoNotifications"
                    checked={alertSettings.autoNotifications}
                    onCheckedChange={(checked) => setAlertSettings(prev => ({
                      ...prev,
                      autoNotifications: checked
                    }))}
                  />
                  <Label htmlFor="autoNotifications">Auto Notifications</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="emailNotifications"
                    checked={alertSettings.emailNotifications}
                    onCheckedChange={(checked) => setAlertSettings(prev => ({
                      ...prev,
                      emailNotifications: checked
                    }))}
                  />
                  <Label htmlFor="emailNotifications">Email Notifications</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="smsNotifications"
                    checked={alertSettings.smsNotifications}
                    onCheckedChange={(checked) => setAlertSettings(prev => ({
                      ...prev,
                      smsNotifications: checked
                    }))}
                  />
                  <Label htmlFor="smsNotifications">SMS Notifications</Label>
                </div>
                <div>
                  <Label htmlFor="notificationFrequency">Notification Frequency</Label>
                  <Select
                    value={alertSettings.notificationFrequency}
                    onValueChange={(value) => setAlertSettings(prev => ({
                      ...prev,
                      notificationFrequency: value
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs defaultValue="alerts" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="alerts">Alert List</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Alert List */}
        <TabsContent value="alerts" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Alert Filters</CardTitle>
                <Filter className="h-4 w-4 text-gray-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="severity-filter">Severity</Label>
                  <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                    <SelectTrigger id="severity-filter" className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="status-filter">Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger id="status-filter" className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="acknowledged">Acknowledged</SelectItem>
                      <SelectItem value="unacknowledged">Unacknowledged</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="sort-by">Sort By</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger id="sort-by" className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgency">Urgency</SelectItem>
                      <SelectItem value="severity">Severity</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="balance">Balance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alert List */}
          <div className="space-y-3">
            {sortedAlerts.map((alert) => (
              <Card 
                key={alert.id} 
                className={`cursor-pointer transition-all ${
                  selectedAlert?.id === alert.id ? 'ring-2 ring-blue-500' : ''
                } ${alert.acknowledgedAt ? 'opacity-75' : ''}`}
                onClick={() => setSelectedAlert(alert)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getSeverityIcon(alert.severity)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                          <span className="text-sm font-medium">
                            Student: {alert.studentId}
                          </span>
                          {alert.acknowledgedAt && (
                            <Badge variant="secondary" className="text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Acknowledged
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-medium mb-1">{alert.recommendedAction}</h3>
                        <p className="text-sm text-gray-600 mb-2">
                          Current Balance: {formatHours(alert.currentBalance)} hours • 
                          {alert.daysRemaining} days remaining • 
                          {alert.upcomingClasses} upcoming classes
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>Usage Rate: {formatHours(alert.recentUsageRate)} hrs/day</span>
                          <span>Recommended: {alert.recommendedPackageSize} hours</span>
                          <span>Created: {formatDate(alert.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <div className="flex items-center space-x-1">
                          <div className={`w-2 h-2 rounded-full ${getUrgencyColor(alert.urgencyLevel)}`}></div>
                          <span className="text-xs text-gray-500">
                            Urgency: {alert.urgencyLevel}/10
                          </span>
                        </div>
                        {alert.estimatedRunOutDate && (
                          <p className="text-xs text-gray-500 mt-1">
                            Est. run out: {formatDate(alert.estimatedRunOutDate)}
                          </p>
                        )}
                      </div>
                      {!alert.acknowledgedAt && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            acknowledgeAlert(alert.id);
                          }}
                          variant="outline"
                          size="sm"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Acknowledge
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {sortedAlerts.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No alerts match your current filters</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Alert Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={generateAlertChartData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="severity" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alert Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={generateTrendData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="alerts" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Alert Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium">Key Metrics</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Average Urgency Level</span>
                      <span className="font-medium">
                        {alerts.length > 0 ? 
                          (alerts.reduce((sum, a) => sum + a.urgencyLevel, 0) / alerts.length).toFixed(1) : 
                          '0'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Response Rate</span>
                      <span className="font-medium">
                        {alerts.length > 0 ? 
                          Math.round((alerts.filter(a => a.acknowledgedAt).length / alerts.length) * 100) : 
                          0
                        }%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Avg Balance at Alert</span>
                      <span className="font-medium">
                        {alerts.length > 0 ? 
                          formatHours(alerts.reduce((sum, a) => sum + a.currentBalance, 0) / alerts.length) : 
                          '0'
                        } hrs
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium">Recommendations</h4>
                  <div className="space-y-2">
                    {alerts.filter(a => a.severity === 'critical').length > 0 && (
                      <div className="p-2 bg-red-50 rounded text-sm">
                        <p className="font-medium text-red-800">Critical Action Required</p>
                        <p className="text-red-700">
                          {alerts.filter(a => a.severity === 'critical').length} students need immediate attention
                        </p>
                      </div>
                    )}
                    {alerts.filter(a => !a.acknowledgedAt).length > 5 && (
                      <div className="p-2 bg-yellow-50 rounded text-sm">
                        <p className="font-medium text-yellow-800">High Unacknowledged Count</p>
                        <p className="text-yellow-700">
                          Review notification settings and response procedures
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alert History</CardTitle>
              <CardDescription>
                Historical view of all alerts and their resolution status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getSeverityIcon(alert.severity)}
                      <div>
                        <p className="font-medium">{alert.recommendedAction}</p>
                        <p className="text-sm text-gray-600">
                          Student: {alert.studentId} • 
                          Balance: {formatHours(alert.currentBalance)} hrs • 
                          {formatDate(alert.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                      {alert.acknowledgedAt ? (
                        <Badge variant="secondary">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Acknowledged
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                {alerts.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No alert history available
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