"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Mail, 
  Send, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  Settings,
  Download,
  Filter,
  Search
} from 'lucide-react';

import { getEmailService, getEmailQueueService } from '@/lib/services/email-service';
import { getEmailNotificationService } from '@/lib/services/email-notification-service';
import { EmailQueueJob } from '@/lib/services/email-queue-service';

interface EmailStats {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalBounced: number;
  totalComplaints: number;
  deliveryRate: number;
  bounceRate: number;
  complaintRate: number;
}

interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

export default function EmailManagementDashboard() {
  const [emailStats, setEmailStats] = useState<EmailStats | null>(null);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [queueJobs, setQueueJobs] = useState<EmailQueueJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const emailService = getEmailService();
  const queueService = getEmailQueueService();
  const notificationService = getEmailNotificationService();

  useEffect(() => {
    loadDashboardData();
    
    // Set up auto-refresh
    const interval = setInterval(loadDashboardData, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load email metrics
      const stats = await emailService.getEmailMetrics();
      setEmailStats(stats);
      
      // Load queue stats
      const qStats = queueService.getQueueStats();
      setQueueStats(qStats);
      
      // Load queue jobs
      const jobs = Array.from([
        ...queueService.getJobsByStatus('pending'),
        ...queueService.getJobsByStatus('processing'),
        ...queueService.getJobsByStatus('completed').slice(0, 50),
        ...queueService.getJobsByStatus('failed')
      ]);
      setQueueJobs(jobs);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      await queueService.retryJob(jobId);
      await loadDashboardData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry job');
    }
  };

  const handleClearCompleted = async () => {
    try {
      queueService.clearCompletedJobs();
      await loadDashboardData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear completed jobs');
    }
  };

  const handleClearFailed = async () => {
    try {
      queueService.clearFailedJobs();
      await loadDashboardData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear failed jobs');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'processing':
        return <Badge variant="default">Processing</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">Urgent</Badge>;
      case 'high':
        return <Badge variant="default" className="bg-orange-500">High</Badge>;
      case 'normal':
        return <Badge variant="secondary">Normal</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const filteredJobs = queueJobs.filter(job => {
    const matchesStatus = selectedStatus === 'all' || job.status === selectedStatus;
    const matchesSearch = searchTerm === '' || 
      job.message.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.message.to.some(recipient => 
        recipient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipient.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Email Management Dashboard</h1>
        <Button onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="queue">Email Queue</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {emailStats && (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
                    <Send className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{emailStats.totalSent.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      {emailStats.deliveryRate.toFixed(1)}% delivery rate
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Delivered</CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{emailStats.totalDelivered.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      {emailStats.totalSent > 0 ? ((emailStats.totalDelivered / emailStats.totalSent) * 100).toFixed(1) : 0}%
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Failed</CardTitle>
                    <XCircle className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{emailStats.totalFailed.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      {emailStats.totalSent > 0 ? ((emailStats.totalFailed / emailStats.totalSent) * 100).toFixed(1) : 0}%
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
                    <TrendingDown className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{emailStats.bounceRate.toFixed(1)}%</div>
                    <p className="text-xs text-muted-foreground">
                      {emailStats.totalBounced.toLocaleString()} bounced
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Queue Stats */}
          {queueStats && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Email Queue Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{queueStats.total}</div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{queueStats.pending}</div>
                    <div className="text-sm text-muted-foreground">Pending</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{queueStats.processing}</div>
                    <div className="text-sm text-muted-foreground">Processing</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{queueStats.completed}</div>
                    <div className="text-sm text-muted-foreground">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{queueStats.failed}</div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>
                </div>
                
                {queueStats.total > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Queue Progress</span>
                      <span>{((queueStats.completed / queueStats.total) * 100).toFixed(1)}%</span>
                    </div>
                    <Progress value={(queueStats.completed / queueStats.total) * 100} />
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="queue" className="space-y-4">
          {/* Queue Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Queue Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <Label htmlFor="search">Search Jobs</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search by subject, recipient..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label>Filter by Status</Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleClearCompleted} variant="outline">
                  Clear Completed
                </Button>
                <Button onClick={handleClearFailed} variant="outline">
                  Clear Failed
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Queue Jobs */}
          <Card>
            <CardHeader>
              <CardTitle>Email Jobs ({filteredJobs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredJobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No jobs found matching your criteria.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredJobs.map((job) => (
                    <div key={job.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(job.status)}
                          {getPriorityBadge(job.priority)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {new Date(job.createdAt).toLocaleString()}
                          </span>
                          {job.status === 'failed' && (
                            <Button
                              size="sm"
                              onClick={() => handleRetryJob(job.id)}
                              variant="outline"
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Retry
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <div className="font-medium">{job.message.subject}</div>
                        <div className="text-sm text-muted-foreground">
                          To: {job.message.to.map(r => r.email).join(', ')}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Attempts: {job.attempts}/{job.maxAttempts}</span>
                        {job.lastAttemptAt && (
                          <span>Last attempt: {new Date(job.lastAttemptAt).toLocaleString()}</span>
                        )}
                        {job.lastError && (
                          <span className="text-red-600">Error: {job.lastError}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Email Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {emailStats && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-4">Delivery Performance</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Delivery Rate</span>
                          <span className="font-medium">{emailStats.deliveryRate.toFixed(1)}%</span>
                        </div>
                        <Progress value={emailStats.deliveryRate} className="h-2" />
                        
                        <div className="flex justify-between">
                          <span>Bounce Rate</span>
                          <span className="font-medium">{emailStats.bounceRate.toFixed(1)}%</span>
                        </div>
                        <Progress value={emailStats.bounceRate} className="h-2" />
                        
                        <div className="flex justify-between">
                          <span>Complaint Rate</span>
                          <span className="font-medium">{emailStats.complaintRate.toFixed(1)}%</span>
                        </div>
                        <Progress value={emailStats.complaintRate} className="h-2" />
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-4">Volume Summary</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Total Sent</span>
                          <span className="font-medium">{emailStats.totalSent.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Successfully Delivered</span>
                          <span className="font-medium text-green-600">{emailStats.totalDelivered.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Failed</span>
                          <span className="font-medium text-red-600">{emailStats.totalFailed.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Bounced</span>
                          <span className="font-medium text-orange-600">{emailStats.totalBounced.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Email Service Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Email service configuration is managed through environment variables. 
                    Contact your system administrator to modify these settings.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <Label>Current Configuration</Label>
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <span className="text-sm font-medium">Service Provider</span>
                      <div className="text-sm text-muted-foreground">Mailgun</div>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Domain</span>
                      <div className="text-sm text-muted-foreground">
                        {process.env.NEXT_PUBLIC_MAILGUN_DOMAIN || 'Not configured'}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Test Mode</span>
                      <div className="text-sm text-muted-foreground">
                        {process.env.NODE_ENV !== 'production' ? 'Enabled' : 'Disabled'}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Queue Processing</span>
                      <div className="text-sm text-muted-foreground">Active</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}