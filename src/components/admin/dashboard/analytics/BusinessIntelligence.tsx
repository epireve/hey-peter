"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  BarChart3,
  PieChart,
  Calendar,
  Globe,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { AnalyticsChart } from "../AnalyticsChart";

interface BusinessIntelligenceProps {
  className?: string;
}

interface BusinessMetrics {
  revenue: {
    monthly: number;
    quarterly: number;
    annual: number;
    monthlyGrowth: number;
    quarterlyGrowth: number;
  };
  profitability: {
    grossMargin: number;
    netMargin: number;
    operatingMargin: number;
    costPerStudent: number;
    revenuePerStudent: number;
  };
  courseAnalytics: Array<{
    name: string;
    revenue: number;
    students: number;
    growthRate: number;
    profitMargin: number;
  }>;
  revenueForecasting: Array<{
    month: string;
    actual?: number;
    projected: number;
    conservative: number;
    optimistic: number;
  }>;
  marketAnalysis: {
    marketSize: number;
    marketShare: number;
    customerAcquisitionCost: number;
    customerLifetimeValue: number;
    churnRate: number;
  };
  operationalEfficiency: {
    utilizationRate: number;
    capacityOptimization: number;
    resourceEfficiency: number;
    automationLevel: number;
  };
  competitiveMetrics: {
    priceCompetitiveness: number;
    qualityScore: number;
    innovationIndex: number;
    customerSatisfaction: number;
  };
  kpiTracking: Array<{
    name: string;
    current: number;
    target: number;
    progress: number;
    trend: 'up' | 'down' | 'stable';
  }>;
}

export function BusinessIntelligence({ className }: BusinessIntelligenceProps) {
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('monthly');

  useEffect(() => {
    loadBusinessMetrics();
  }, [period]);

  const loadBusinessMetrics = async () => {
    try {
      setLoading(true);
      
      // Mock data representing business intelligence metrics
      const mockMetrics: BusinessMetrics = {
        revenue: {
          monthly: 87450,
          quarterly: 254300,
          annual: 1012000,
          monthlyGrowth: 12.3,
          quarterlyGrowth: 8.7
        },
        profitability: {
          grossMargin: 68.5,
          netMargin: 24.7,
          operatingMargin: 32.1,
          costPerStudent: 125,
          revenuePerStudent: 425
        },
        courseAnalytics: [
          { name: 'Business English', revenue: 28500, students: 67, growthRate: 15.2, profitMargin: 72.3 },
          { name: 'Conversation Classes', revenue: 22100, students: 89, growthRate: 8.7, profitMargin: 65.8 },
          { name: '1-on-1 Sessions', revenue: 18900, students: 24, growthRate: 22.1, profitMargin: 78.9 },
          { name: 'IELTS Preparation', revenue: 12650, students: 32, growthRate: 18.5, profitMargin: 69.4 },
          { name: 'Grammar Intensive', revenue: 5300, students: 28, growthRate: -2.3, profitMargin: 58.7 }
        ],
        revenueForecasting: [
          { month: 'Jan', actual: 78200, projected: 80000, conservative: 75000, optimistic: 85000 },
          { month: 'Feb', actual: 82100, projected: 82000, conservative: 78000, optimistic: 87000 },
          { month: 'Mar', actual: 85600, projected: 84500, conservative: 81000, optimistic: 89000 },
          { month: 'Apr', actual: 87450, projected: 87000, conservative: 83500, optimistic: 92000 },
          { month: 'May', projected: 90000, conservative: 86000, optimistic: 95000 },
          { month: 'Jun', projected: 93000, conservative: 89000, optimistic: 98000 }
        ],
        marketAnalysis: {
          marketSize: 2400000,
          marketShare: 4.2,
          customerAcquisitionCost: 85,
          customerLifetimeValue: 1250,
          churnRate: 8.5
        },
        operationalEfficiency: {
          utilizationRate: 78.5,
          capacityOptimization: 82.3,
          resourceEfficiency: 74.8,
          automationLevel: 65.2
        },
        competitiveMetrics: {
          priceCompetitiveness: 85.7,
          qualityScore: 92.3,
          innovationIndex: 78.9,
          customerSatisfaction: 88.4
        },
        kpiTracking: [
          { name: 'Monthly Revenue', current: 87450, target: 90000, progress: 97.2, trend: 'up' },
          { name: 'New Student Acquisition', current: 24, target: 30, progress: 80.0, trend: 'up' },
          { name: 'Customer Satisfaction', current: 4.3, target: 4.5, progress: 95.6, trend: 'stable' },
          { name: 'Class Utilization', current: 78.5, target: 85, progress: 92.4, trend: 'up' },
          { name: 'Teacher Retention', current: 92, target: 95, progress: 96.8, trend: 'down' }
        ]
      };

      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Failed to load business metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-8">
        <p>Failed to load business intelligence data</p>
      </div>
    );
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <ArrowUpRight className="h-4 w-4 text-green-500" />;
      case 'down': return <ArrowDownRight className="h-4 w-4 text-red-500" />;
      default: return <BarChart3 className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Business Intelligence</h2>
          <p className="text-muted-foreground">
            Revenue tracking, forecasting, market analysis, and strategic insights
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant={period === 'monthly' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('monthly')}
          >
            Monthly
          </Button>
          <Button
            variant={period === 'quarterly' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('quarterly')}
          >
            Quarterly
          </Button>
          <Button
            variant={period === 'annual' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('annual')}
          >
            Annual
          </Button>
        </div>
      </div>

      {/* Revenue Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.revenue.monthly.toLocaleString()}</div>
            <p className="text-xs text-green-600">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              +{metrics.revenue.monthlyGrowth}% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Margin</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.profitability.grossMargin}%</div>
            <Progress value={metrics.profitability.grossMargin} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Market Share</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.marketAnalysis.marketShare}%</div>
            <p className="text-xs text-muted-foreground">
              of addressable market
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">LTV:CAC Ratio</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(metrics.marketAnalysis.customerLifetimeValue / metrics.marketAnalysis.customerAcquisitionCost).toFixed(1)}:1
            </div>
            <p className="text-xs text-green-600">
              Healthy ratio (>3:1)
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenue Analysis</TabsTrigger>
          <TabsTrigger value="courses">Course Performance</TabsTrigger>
          <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
          <TabsTrigger value="market">Market Analysis</TabsTrigger>
          <TabsTrigger value="kpis">KPI Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
                <CardDescription>
                  Revenue distribution and profitability metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Monthly Revenue</span>
                    <span className="text-lg font-bold">${metrics.revenue.monthly.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Quarterly Revenue</span>
                    <span className="text-lg font-bold">${metrics.revenue.quarterly.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Annual Revenue</span>
                    <span className="text-lg font-bold">${metrics.revenue.annual.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profitability Metrics</CardTitle>
                <CardDescription>
                  Margin analysis and cost efficiency
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Gross Margin</span>
                      <span className="font-medium">{metrics.profitability.grossMargin}%</span>
                    </div>
                    <Progress value={metrics.profitability.grossMargin} />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Operating Margin</span>
                      <span className="font-medium">{metrics.profitability.operatingMargin}%</span>
                    </div>
                    <Progress value={metrics.profitability.operatingMargin} />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Net Margin</span>
                      <span className="font-medium">{metrics.profitability.netMargin}%</span>
                    </div>
                    <Progress value={metrics.profitability.netMargin} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Cost Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">${metrics.profitability.costPerStudent}</div>
                  <div className="text-sm text-muted-foreground">Cost per Student</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">${metrics.profitability.revenuePerStudent}</div>
                  <div className="text-sm text-muted-foreground">Revenue per Student</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    ${metrics.profitability.revenuePerStudent - metrics.profitability.costPerStudent}
                  </div>
                  <div className="text-sm text-muted-foreground">Profit per Student</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="courses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Course Performance Analysis</CardTitle>
              <CardDescription>
                Revenue and profitability by course type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.courseAnalytics.map((course, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div>
                        <div className="font-medium">{course.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {course.students} students
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-6 text-center">
                      <div>
                        <div className="text-lg font-bold">${course.revenue.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Revenue</div>
                      </div>
                      <div>
                        <div className={`text-lg font-bold ${course.growthRate > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {course.growthRate > 0 ? '+' : ''}{course.growthRate}%
                        </div>
                        <div className="text-xs text-muted-foreground">Growth</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold">{course.profitMargin}%</div>
                        <div className="text-xs text-muted-foreground">Margin</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Course</CardTitle>
              </CardHeader>
              <CardContent>
                <AnalyticsChart
                  title=""
                  data={metrics.courseAnalytics}
                  type="pie"
                  dataKey="revenue"
                  height={250}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Growth Rate Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <AnalyticsChart
                  title=""
                  data={metrics.courseAnalytics}
                  type="bar"
                  dataKey="growthRate"
                  xAxisKey="name"
                  height={250}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="forecasting" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Forecasting</CardTitle>
              <CardDescription>
                Projected revenue with conservative and optimistic scenarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AnalyticsChart
                title=""
                data={metrics.revenueForecasting}
                type="line"
                dataKey={["actual", "projected", "conservative", "optimistic"]}
                xAxisKey="month"
                height={350}
                colors={["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6"]}
              />
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Conservative Forecast</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">$89,000</div>
                <p className="text-sm text-muted-foreground">Next month projection</p>
                <div className="mt-2">
                  <div className="text-xs text-muted-foreground">Based on:</div>
                  <ul className="text-xs text-muted-foreground mt-1">
                    <li>• Historical low-growth periods</li>
                    <li>• Market uncertainties</li>
                    <li>• Conservative student acquisition</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Projected Forecast</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">$90,000</div>
                <p className="text-sm text-muted-foreground">Next month projection</p>
                <div className="mt-2">
                  <div className="text-xs text-muted-foreground">Based on:</div>
                  <ul className="text-xs text-muted-foreground mt-1">
                    <li>• Current growth trends</li>
                    <li>• Seasonal patterns</li>
                    <li>• Market conditions</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Optimistic Forecast</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">$95,000</div>
                <p className="text-sm text-muted-foreground">Next month projection</p>
                <div className="mt-2">
                  <div className="text-xs text-muted-foreground">Based on:</div>
                  <ul className="text-xs text-muted-foreground mt-1">
                    <li>• Accelerated growth</li>
                    <li>• New market opportunities</li>
                    <li>• Successful campaigns</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="market" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Market Size</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${(metrics.marketAnalysis.marketSize / 1000000).toFixed(1)}M</div>
                <p className="text-xs text-muted-foreground">Total addressable market</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Customer Acquisition Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${metrics.marketAnalysis.customerAcquisitionCost}</div>
                <p className="text-xs text-muted-foreground">Average CAC</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Customer Lifetime Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${metrics.marketAnalysis.customerLifetimeValue}</div>
                <p className="text-xs text-muted-foreground">Average CLV</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Churn Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.marketAnalysis.churnRate}%</div>
                <p className="text-xs text-muted-foreground">Monthly churn</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Competitive Position</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Price Competitiveness</span>
                      <span className="font-medium">{metrics.competitiveMetrics.priceCompetitiveness}%</span>
                    </div>
                    <Progress value={metrics.competitiveMetrics.priceCompetitiveness} />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Quality Score</span>
                      <span className="font-medium">{metrics.competitiveMetrics.qualityScore}%</span>
                    </div>
                    <Progress value={metrics.competitiveMetrics.qualityScore} />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Innovation Index</span>
                      <span className="font-medium">{metrics.competitiveMetrics.innovationIndex}%</span>
                    </div>
                    <Progress value={metrics.competitiveMetrics.innovationIndex} />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Customer Satisfaction</span>
                      <span className="font-medium">{metrics.competitiveMetrics.customerSatisfaction}%</span>
                    </div>
                    <Progress value={metrics.competitiveMetrics.customerSatisfaction} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Operational Efficiency</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{metrics.operationalEfficiency.utilizationRate}%</div>
                  <div className="text-sm text-muted-foreground">Utilization Rate</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{metrics.operationalEfficiency.capacityOptimization}%</div>
                  <div className="text-sm text-muted-foreground">Capacity Optimization</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{metrics.operationalEfficiency.resourceEfficiency}%</div>
                  <div className="text-sm text-muted-foreground">Resource Efficiency</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{metrics.operationalEfficiency.automationLevel}%</div>
                  <div className="text-sm text-muted-foreground">Automation Level</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kpis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Key Performance Indicators</CardTitle>
              <CardDescription>
                Track progress against strategic goals and targets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.kpiTracking.map((kpi, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div>
                        <div className="font-medium">{kpi.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Target: {kpi.target.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <div className="text-lg font-bold">{kpi.current.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Current</div>
                      </div>
                      <div className="w-32">
                        <Progress value={kpi.progress} />
                        <div className="text-xs text-center mt-1">{kpi.progress.toFixed(1)}%</div>
                      </div>
                      <div className="flex items-center">
                        {getTrendIcon(kpi.trend)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>On Track</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">3</div>
                  <div className="text-sm text-muted-foreground">KPIs achieving targets</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>At Risk</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600">1</div>
                  <div className="text-sm text-muted-foreground">KPIs needing attention</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Behind Target</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">1</div>
                  <div className="text-sm text-muted-foreground">KPIs significantly behind</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}