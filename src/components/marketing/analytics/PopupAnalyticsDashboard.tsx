'use client';

import { logger } from '@/lib/services';

// ========================================
// Popup Analytics Dashboard
// Comprehensive analytics tracking for popup performance
// ========================================

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  MousePointer, 
  Users, 
  Target, 
  DollarSign,
  Mail,
  BarChart3,
  Calendar,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { LineChart } from '@/components/ui/charts/LineChart';
import { BarChart } from '@/components/ui/charts/BarChart';
import { PieChart } from '@/components/ui/charts/PieChart';
import { AreaChart } from '@/components/ui/charts/AreaChart';
import { popupMarketingService } from '@/lib/services/popup-marketing-service';
import { cn } from '@/lib/utils';
import type {
  CampaignPerformance,
  ABTestResult,
  LeadQualityMetrics,
  PopupSystemMetrics,
  PopupAnalytics,
  PopupCampaign
} from '@/types/popup-marketing';

interface AnalyticsFilters {
  dateRange: {
    from: Date;
    to: Date;
  };
  campaignId?: string;
  timeframe: 'day' | 'hour';
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  format?: 'number' | 'currency' | 'percentage';
}

function MetricCard({ 
  title, 
  value, 
  change, 
  changeLabel, 
  icon, 
  trend = 'neutral',
  format = 'number'
}: MetricCardProps) {
  const formatValue = (val: string | number) => {
    if (format === 'currency') {
      return typeof val === 'number' ? `$${val.toLocaleString()}` : val;
    }
    if (format === 'percentage') {
      return typeof val === 'number' ? `${val.toFixed(2)}%` : val;
    }
    return typeof val === 'number' ? val.toLocaleString() : val;
  };

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-600" />;
    return null;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              {icon}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold">{formatValue(value)}</p>
            </div>
          </div>
          {change !== undefined && (
            <div className={cn('flex items-center space-x-1', getTrendColor())}>
              {getTrendIcon()}
              <span className="text-sm font-medium">
                {change > 0 ? '+' : ''}{change.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        {changeLabel && (
          <p className="text-xs text-gray-500 mt-2">{changeLabel}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function PopupAnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AnalyticsFilters>({
    dateRange: {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      to: new Date()
    },
    timeframe: 'day'
  });

  // Data state
  const [systemMetrics, setSystemMetrics] = useState<PopupSystemMetrics | null>(null);
  const [campaignPerformance, setCampaignPerformance] = useState<CampaignPerformance[]>([]);
  const [abTestResults, setABTestResults] = useState<ABTestResult[]>([]);
  const [leadQualityMetrics, setLeadQualityMetrics] = useState<LeadQualityMetrics[]>([]);
  const [analyticsData, setAnalyticsData] = useState<PopupAnalytics[]>([]);
  const [campaigns, setCampaigns] = useState<PopupCampaign[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [filters]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [
        systemMetricsData,
        campaignPerformanceData,
        leadQualityData,
        analyticsTimeData,
        campaignsData
      ] = await Promise.all([
        popupMarketingService.getSystemMetrics(),
        popupMarketingService.getCampaignPerformance(
          filters.campaignId,
          filters.dateRange.from.toISOString(),
          filters.dateRange.to.toISOString()
        ),
        popupMarketingService.getLeadQualityMetrics(
          filters.campaignId,
          filters.dateRange.from.toISOString(),
          filters.dateRange.to.toISOString()
        ),
        popupMarketingService.getAnalytics(
          filters.campaignId,
          undefined,
          filters.dateRange.from.toISOString(),
          filters.dateRange.to.toISOString(),
          filters.timeframe
        ),
        popupMarketingService.getCampaigns({ status: 'active' })
      ]);

      setSystemMetrics(systemMetricsData);
      setCampaignPerformance(campaignPerformanceData);
      setLeadQualityMetrics(leadQualityData);
      setAnalyticsData(analyticsTimeData);
      setCampaigns(campaignsData.campaigns);

      // Load A/B test results for campaigns with A/B testing enabled
      const abTestPromises = campaignsData.campaigns
        .filter(c => c.ab_testing_enabled)
        .map(c => popupMarketingService.getABTestResults(c.id));
      
      const abTestData = await Promise.all(abTestPromises);
      setABTestResults(abTestData.flat());

    } catch (error) {
      logger.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    logger.info('Exporting analytics data...');
  };

  // Prepare chart data
  const prepareTimeSeriesData = () => {
    return analyticsData.map(item => ({
      date: item.analytics_date,
      impressions: item.impressions,
      clicks: item.clicks,
      conversions: item.conversions,
      ctr: item.click_through_rate * 100,
      conversionRate: item.conversion_rate * 100
    }));
  };

  const prepareCampaignComparisonData = () => {
    return campaignPerformance.map(campaign => ({
      name: campaign.name,
      impressions: campaign.total_impressions,
      conversions: campaign.total_conversions,
      revenue: campaign.total_revenue,
      ctr: campaign.ctr_percentage,
      conversionRate: campaign.conversion_percentage
    }));
  };

  const prepareLeadSourceData = () => {
    const leadSources = leadQualityMetrics.reduce((acc, metric) => {
      acc[metric.campaign_name] = metric.total_leads;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(leadSources).map(([name, value]) => ({
      name,
      value
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Popup Marketing Analytics</h1>
          <p className="text-gray-600">
            Monitor popup performance, A/B test results, and lead generation metrics
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <DatePickerWithRange
                value={filters.dateRange}
                onChange={(range) => setFilters(prev => ({ 
                  ...prev, 
                  dateRange: range || prev.dateRange 
                }))}
              />
            </div>
            
            <Select
              value={filters.campaignId || 'all'}
              onValueChange={(value) => setFilters(prev => ({ 
                ...prev, 
                campaignId: value === 'all' ? undefined : value 
              }))}
            >
              <SelectTrigger className="w-full lg:w-64">
                <SelectValue placeholder="All Campaigns" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                {campaigns.map(campaign => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.timeframe}
              onValueChange={(value: 'day' | 'hour') => setFilters(prev => ({ 
                ...prev, 
                timeframe: value 
              }))}
            >
              <SelectTrigger className="w-full lg:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Daily</SelectItem>
                <SelectItem value="hour">Hourly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* System Metrics */}
      {systemMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Campaigns"
            value={systemMetrics.totalCampaigns}
            icon={<BarChart3 className="h-5 w-5 text-blue-600" />}
          />
          <MetricCard
            title="Total Impressions"
            value={systemMetrics.totalImpressions}
            icon={<Users className="h-5 w-5 text-blue-600" />}
          />
          <MetricCard
            title="Conversion Rate"
            value={systemMetrics.overallConversionRate}
            format="percentage"
            icon={<Target className="h-5 w-5 text-blue-600" />}
          />
          <MetricCard
            title="Total Revenue"
            value={systemMetrics.totalRevenue}
            format="currency"
            icon={<DollarSign className="h-5 w-5 text-blue-600" />}
          />
        </div>
      )}

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="abtests">A/B Tests</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Over Time */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Over Time</CardTitle>
                <CardDescription>
                  Track impressions, clicks, and conversions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AreaChart
                  data={prepareTimeSeriesData()}
                  xKey="date"
                  yKeys={['impressions', 'clicks', 'conversions']}
                  colors={['#3b82f6', '#10b981', '#f59e0b']}
                />
              </CardContent>
            </Card>

            {/* Conversion Funnel */}
            <Card>
              <CardHeader>
                <CardTitle>Conversion Funnel</CardTitle>
                <CardDescription>
                  Visitor journey through popup interaction
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {systemMetrics && (
                    <>
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
                        <span>Impressions</span>
                        <span className="font-semibold">{systemMetrics.totalImpressions.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded">
                        <span>Conversions</span>
                        <span className="font-semibold">{systemMetrics.totalConversions.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded">
                        <span>Leads Generated</span>
                        <span className="font-semibold">{systemMetrics.totalLeads.toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Conversion Rates Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Conversion Rates Trend</CardTitle>
              <CardDescription>
                Track how conversion rates change over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LineChart
                data={prepareTimeSeriesData()}
                xKey="date"
                yKeys={['ctr', 'conversionRate']}
                colors={['#8b5cf6', '#ef4444']}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Campaign Performance Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Campaign Performance</CardTitle>
                <CardDescription>
                  Compare performance across campaigns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={prepareCampaignComparisonData()}
                  xKey="name"
                  yKeys={['impressions', 'conversions']}
                  colors={['#3b82f6', '#10b981']}
                />
              </CardContent>
            </Card>

            {/* Lead Sources */}
            <Card>
              <CardHeader>
                <CardTitle>Lead Sources</CardTitle>
                <CardDescription>
                  Distribution of leads by campaign
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PieChart
                  data={prepareLeadSourceData()}
                  nameKey="name"
                  valueKey="value"
                />
              </CardContent>
            </Card>
          </div>

          {/* Campaign Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Campaign Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Campaign</th>
                      <th className="text-right p-2">Impressions</th>
                      <th className="text-right p-2">Clicks</th>
                      <th className="text-right p-2">CTR</th>
                      <th className="text-right p-2">Conversions</th>
                      <th className="text-right p-2">Conv. Rate</th>
                      <th className="text-right p-2">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaignPerformance.map(campaign => (
                      <tr key={campaign.id} className="border-b">
                        <td className="p-2">
                          <div>
                            <div className="font-medium">{campaign.name}</div>
                            <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                              {campaign.status}
                            </Badge>
                          </div>
                        </td>
                        <td className="text-right p-2">{campaign.total_impressions.toLocaleString()}</td>
                        <td className="text-right p-2">{campaign.total_clicks.toLocaleString()}</td>
                        <td className="text-right p-2">{campaign.ctr_percentage.toFixed(2)}%</td>
                        <td className="text-right p-2">{campaign.total_conversions.toLocaleString()}</td>
                        <td className="text-right p-2">{campaign.conversion_percentage.toFixed(2)}%</td>
                        <td className="text-right p-2">${campaign.total_revenue.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* A/B Tests Tab */}
        <TabsContent value="abtests" className="space-y-6">
          {abTestResults.length > 0 ? (
            <div className="space-y-6">
              {Object.entries(
                abTestResults.reduce((acc, result) => {
                  if (!acc[result.campaign_id]) {
                    acc[result.campaign_id] = [];
                  }
                  acc[result.campaign_id].push(result);
                  return acc;
                }, {} as Record<string, ABTestResult[]>)
              ).map(([campaignId, results]) => (
                <Card key={campaignId}>
                  <CardHeader>
                    <CardTitle>{results[0].campaign_name}</CardTitle>
                    <CardDescription>A/B Test Results</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Variation</th>
                            <th className="text-center p-2">Traffic %</th>
                            <th className="text-right p-2">Impressions</th>
                            <th className="text-right p-2">CTR</th>
                            <th className="text-right p-2">Conv. Rate</th>
                            <th className="text-right p-2">Revenue</th>
                            <th className="text-center p-2">Winner</th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.map(result => (
                            <tr key={result.variation_id} className="border-b">
                              <td className="p-2">
                                <div className="flex items-center space-x-2">
                                  <span>{result.variation_name}</span>
                                  {result.is_control && (
                                    <Badge variant="outline">Control</Badge>
                                  )}
                                </div>
                              </td>
                              <td className="text-center p-2">{result.traffic_percentage}%</td>
                              <td className="text-right p-2">{result.impressions.toLocaleString()}</td>
                              <td className="text-right p-2">{result.ctr_percentage.toFixed(2)}%</td>
                              <td className="text-right p-2">{result.conversion_percentage.toFixed(2)}%</td>
                              <td className="text-right p-2">${result.revenue.toLocaleString()}</td>
                              <td className="text-center p-2">
                                {result.statistical_significance && (
                                  <Badge variant="default">✓</Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No A/B Tests Active</h3>
                <p className="text-gray-600">Enable A/B testing on your campaigns to see results here.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Leads Tab */}
        <TabsContent value="leads" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Total Leads"
              value={systemMetrics?.totalLeads || 0}
              icon={<Mail className="h-5 w-5 text-blue-600" />}
            />
            <MetricCard
              title="Avg. Lead Score"
              value={systemMetrics?.averageLeadScore || 0}
              icon={<Target className="h-5 w-5 text-blue-600" />}
            />
            <MetricCard
              title="Qualified Leads"
              value={leadQualityMetrics.reduce((sum, m) => sum + m.qualified_leads, 0)}
              icon={<Users className="h-5 w-5 text-blue-600" />}
            />
          </div>

          {/* Lead Quality Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Lead Quality by Campaign</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Campaign</th>
                      <th className="text-right p-2">Total Leads</th>
                      <th className="text-right p-2">Qualified</th>
                      <th className="text-right p-2">Converted</th>
                      <th className="text-right p-2">Avg. Score</th>
                      <th className="text-right p-2">Qualification Rate</th>
                      <th className="text-right p-2">Conversion Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leadQualityMetrics.map(metric => (
                      <tr key={metric.campaign_id} className="border-b">
                        <td className="p-2 font-medium">{metric.campaign_name}</td>
                        <td className="text-right p-2">{metric.total_leads}</td>
                        <td className="text-right p-2">{metric.qualified_leads}</td>
                        <td className="text-right p-2">{metric.converted_leads}</td>
                        <td className="text-right p-2">{metric.average_lead_score.toFixed(1)}</td>
                        <td className="text-right p-2">{metric.qualification_rate.toFixed(1)}%</td>
                        <td className="text-right p-2">{metric.lead_conversion_rate.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default PopupAnalyticsDashboard;