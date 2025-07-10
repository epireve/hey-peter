"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Target,
  Clock,
  Users,
  Calendar,
  Settings,
  Filter,
  Search,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Download,
  Upload,
  BookOpen,
  Brain,
  Zap,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Star,
  Cpu,
  Network,
  Database,
  Code
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { 
  SchedulingRecommendation,
  SchedulingMetrics,
  ScheduledClass,
  SchedulingConflict,
  SchedulingRequest,
  RecommendedAction
} from '@/types/scheduling';
import { toast } from '@/components/ui/use-toast';

interface AIRecommendationSystemProps {
  className?: string;
  recommendations: SchedulingRecommendation[];
  metrics: SchedulingMetrics | null;
  onRecommendationAction: (recommendationId: string, action: 'approve' | 'reject' | 'defer', reason?: string) => Promise<void>;
  onBulkAction: (recommendationIds: string[], action: 'approve' | 'reject') => Promise<void>;
  onRegenerateRecommendations: () => Promise<void>;
}

interface RecommendationWithDetails extends SchedulingRecommendation {
  aiReasoning: {
    factors: ReasoningFactor[];
    confidenceFactors: ConfidenceFactor[];
    alternativeOptions: AlternativeOption[];
    riskAssessment: RiskAssessment;
    dataQuality: DataQualityMetrics;
  };
  impactAnalysis: ImpactAnalysis;
  implementationPlan: ImplementationStep[];
  relatedRecommendations: string[];
  userFeedback?: UserFeedback[];
}

interface ReasoningFactor {
  factor: string;
  weight: number;
  score: number;
  explanation: string;
  dataSource: string;
  lastUpdated: string;
}

interface ConfidenceFactor {
  category: 'data_quality' | 'historical_accuracy' | 'algorithm_confidence' | 'domain_knowledge';
  score: number;
  explanation: string;
  impact: 'positive' | 'negative' | 'neutral';
}

interface AlternativeOption {
  id: string;
  description: string;
  score: number;
  tradeoffs: string[];
  feasibility: number;
  estimatedImpact: number;
}

interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high';
  riskFactors: RiskFactor[];
  mitigationStrategies: string[];
  rollbackPlan: string;
}

interface RiskFactor {
  type: 'schedule_disruption' | 'student_satisfaction' | 'teacher_workload' | 'resource_constraint';
  severity: number;
  likelihood: number;
  description: string;
}

interface DataQualityMetrics {
  completeness: number;
  accuracy: number;
  freshness: number;
  consistency: number;
  reliability: number;
}

interface ImpactAnalysis {
  studentsAffected: number;
  teachersAffected: number;
  classesAffected: number;
  estimatedTimeToImplement: number;
  resourceRequirements: string[];
  expectedBenefits: string[];
  potentialDrawbacks: string[];
  successMetrics: string[];
}

interface ImplementationStep {
  step: number;
  description: string;
  estimatedDuration: number;
  dependencies: string[];
  responsibleParty: string;
  resources: string[];
  validationCriteria: string[];
}

interface UserFeedback {
  userId: string;
  rating: number;
  comment: string;
  timestamp: string;
  helpful: boolean;
}

interface RecommendationFilters {
  type: string[];
  priority: string[];
  complexity: string[];
  status: string[];
  confidenceRange: [number, number];
  impactLevel: string[];
}

export function AIRecommendationSystem({ 
  className, 
  recommendations, 
  metrics, 
  onRecommendationAction,
  onBulkAction,
  onRegenerateRecommendations
}: AIRecommendationSystemProps) {
  const [selectedRecommendations, setSelectedRecommendations] = useState<string[]>([]);
  const [expandedRecommendations, setExpandedRecommendations] = useState<string[]>([]);
  const [filters, setFilters] = useState<RecommendationFilters>({
    type: [],
    priority: [],
    complexity: [],
    status: [],
    confidenceRange: [0, 100],
    impactLevel: []
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'confidence' | 'priority' | 'impact' | 'complexity'>('confidence');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<RecommendationWithDetails | null>(null);
  const [showReasoningDialog, setShowReasoningDialog] = useState(false);

  // Enhanced recommendations with AI reasoning details (mock data)
  const enhancedRecommendations: RecommendationWithDetails[] = useMemo(() => {
    return recommendations.map(rec => ({
      ...rec,
      aiReasoning: {
        factors: [
          {
            factor: 'Student Progress Alignment',
            weight: 0.3,
            score: 0.85,
            explanation: 'Students in target group are progressing at similar pace and ready for this content',
            dataSource: 'Student Progress Service',
            lastUpdated: new Date().toISOString()
          },
          {
            factor: 'Teacher Availability',
            weight: 0.25,
            score: 0.7,
            explanation: 'Preferred teacher has good availability but some scheduling constraints',
            dataSource: 'Teacher Schedule API',
            lastUpdated: new Date().toISOString()
          },
          {
            factor: 'Resource Utilization',
            weight: 0.2,
            score: 0.9,
            explanation: 'Classroom resources are optimally utilized with this scheduling',
            dataSource: 'Resource Management System',
            lastUpdated: new Date().toISOString()
          }
        ],
        confidenceFactors: [
          {
            category: 'data_quality',
            score: 0.9,
            explanation: 'High quality recent data available for all relevant factors',
            impact: 'positive'
          },
          {
            category: 'historical_accuracy',
            score: 0.85,
            explanation: 'Similar recommendations have shown 85% success rate historically',
            impact: 'positive'
          },
          {
            category: 'algorithm_confidence',
            score: 0.8,
            explanation: 'Algorithm confidence based on training data and validation metrics',
            impact: 'positive'
          }
        ],
        alternativeOptions: [
          {
            id: 'alt-1',
            description: 'Schedule 1 hour later to accommodate teacher preference',
            score: 0.75,
            tradeoffs: ['Slightly less optimal for student energy levels'],
            feasibility: 0.9,
            estimatedImpact: 0.8
          },
          {
            id: 'alt-2',
            description: 'Use different classroom with better A/V equipment',
            score: 0.7,
            tradeoffs: ['Requires booking different room', 'Slightly further for some students'],
            feasibility: 0.8,
            estimatedImpact: 0.85
          }
        ],
        riskAssessment: {
          overallRisk: 'low',
          riskFactors: [
            {
              type: 'schedule_disruption',
              severity: 2,
              likelihood: 0.1,
              description: 'Minimal risk of schedule disruption due to high confidence in timing'
            },
            {
              type: 'student_satisfaction',
              severity: 1,
              likelihood: 0.05,
              description: 'Very low risk of student dissatisfaction based on preference analysis'
            }
          ],
          mitigationStrategies: [
            'Monitor student feedback in first week',
            'Have backup time slot available',
            'Notify all stakeholders 48 hours in advance'
          ],
          rollbackPlan: 'Revert to original schedule within 24 hours if issues arise'
        },
        dataQuality: {
          completeness: 0.95,
          accuracy: 0.9,
          freshness: 0.85,
          consistency: 0.92,
          reliability: 0.88
        }
      },
      impactAnalysis: {
        studentsAffected: 4,
        teachersAffected: 1,
        classesAffected: 1,
        estimatedTimeToImplement: 15,
        resourceRequirements: ['Classroom booking', 'Schedule update notification'],
        expectedBenefits: [
          'Improved student engagement',
          'Better resource utilization',
          'Reduced scheduling conflicts'
        ],
        potentialDrawbacks: [
          'Minor disruption to existing routines',
          'Requires coordination with facilities'
        ],
        successMetrics: [
          'Student attendance rate >= 95%',
          'Teacher satisfaction score >= 4.5/5',
          'Zero scheduling conflicts'
        ]
      },
      implementationPlan: [
        {
          step: 1,
          description: 'Notify affected students and teacher',
          estimatedDuration: 5,
          dependencies: [],
          responsibleParty: 'Admin Staff',
          resources: ['Email system', 'SMS notifications'],
          validationCriteria: ['All notifications sent successfully', 'Acknowledgments received']
        },
        {
          step: 2,
          description: 'Update scheduling system',
          estimatedDuration: 10,
          dependencies: ['Step 1'],
          responsibleParty: 'Technical Admin',
          resources: ['Scheduling database access'],
          validationCriteria: ['Schedule updated in system', 'Conflicts resolved']
        }
      ],
      relatedRecommendations: [],
      userFeedback: [
        {
          userId: 'admin-001',
          rating: 4,
          comment: 'Good analysis, though could benefit from more teacher input consideration',
          timestamp: new Date().toISOString(),
          helpful: true
        }
      ]
    }));
  }, [recommendations]);

  // Filter and sort recommendations
  const filteredRecommendations = useMemo(() => {
    let filtered = enhancedRecommendations;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(rec =>
        rec.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply type filter
    if (filters.type.length > 0) {
      filtered = filtered.filter(rec => filters.type.includes(rec.type));
    }

    // Apply priority filter
    if (filters.priority.length > 0) {
      filtered = filtered.filter(rec => filters.priority.includes(rec.priority));
    }

    // Apply complexity filter
    if (filters.complexity.length > 0) {
      filtered = filtered.filter(rec => filters.complexity.includes(rec.complexity));
    }

    // Apply confidence range filter
    filtered = filtered.filter(rec => {
      const confidence = rec.confidenceScore * 100;
      return confidence >= filters.confidenceRange[0] && confidence <= filters.confidenceRange[1];
    });

    // Sort recommendations
    filtered.sort((a, b) => {
      let aValue: number, bValue: number;
      
      switch (sortBy) {
        case 'confidence':
          aValue = a.confidenceScore;
          bValue = b.confidenceScore;
          break;
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          aValue = priorityOrder[a.priority];
          bValue = priorityOrder[b.priority];
          break;
        case 'impact':
          aValue = a.impactAnalysis.studentsAffected + a.impactAnalysis.teachersAffected;
          bValue = b.impactAnalysis.studentsAffected + b.impactAnalysis.teachersAffected;
          break;
        case 'complexity':
          const complexityOrder = { low: 1, medium: 2, high: 3 };
          aValue = complexityOrder[a.complexity];
          bValue = complexityOrder[b.complexity];
          break;
        default:
          aValue = a.confidenceScore;
          bValue = b.confidenceScore;
      }

      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });

    return filtered;
  }, [enhancedRecommendations, searchQuery, filters, sortBy, sortOrder]);

  const handleRecommendationToggle = (recommendationId: string) => {
    setSelectedRecommendations(prev =>
      prev.includes(recommendationId)
        ? prev.filter(id => id !== recommendationId)
        : [...prev, recommendationId]
    );
  };

  const handleExpandToggle = (recommendationId: string) => {
    setExpandedRecommendations(prev =>
      prev.includes(recommendationId)
        ? prev.filter(id => id !== recommendationId)
        : [...prev, recommendationId]
    );
  };

  const handleRecommendationAction = async (
    recommendationId: string, 
    action: 'approve' | 'reject' | 'defer',
    reason?: string
  ) => {
    try {
      setIsProcessing(true);
      await onRecommendationAction(recommendationId, action, reason);
      
      toast({
        title: `Recommendation ${action}d`,
        description: `The recommendation has been ${action}d successfully`,
      });
    } catch (error) {
      toast({
        title: "Error processing recommendation",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject') => {
    if (selectedRecommendations.length === 0) {
      toast({
        title: "No recommendations selected",
        description: "Please select at least one recommendation to perform bulk action",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsProcessing(true);
      await onBulkAction(selectedRecommendations, action);
      
      toast({
        title: `Bulk ${action} completed`,
        description: `${selectedRecommendations.length} recommendations have been ${action}d`,
      });
      
      setSelectedRecommendations([]);
    } catch (error) {
      toast({
        title: "Error in bulk action",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const showReasoningDetails = (recommendation: RecommendationWithDetails) => {
    setSelectedRecommendation(recommendation);
    setShowReasoningDialog(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const renderRecommendationCard = (recommendation: RecommendationWithDetails) => {
    const isExpanded = expandedRecommendations.includes(recommendation.id);
    const isSelected = selectedRecommendations.includes(recommendation.id);

    return (
      <Card key={recommendation.id} className={`${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => handleRecommendationToggle(recommendation.id)}
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <Badge variant={getPriorityColor(recommendation.priority)}>
                    {recommendation.priority}
                  </Badge>
                  <Badge variant="outline">
                    {recommendation.type.replace('_', ' ')}
                  </Badge>
                  <Badge variant={getComplexityColor(recommendation.complexity)}>
                    {recommendation.complexity} complexity
                  </Badge>
                </div>
                <CardTitle className="text-lg">{recommendation.description}</CardTitle>
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center space-x-1">
                    <Brain className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {(recommendation.confidenceScore * 100).toFixed(1)}% confidence
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {recommendation.impactAnalysis.studentsAffected} students affected
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {recommendation.impactAnalysis.estimatedTimeToImplement}min to implement
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => showReasoningDetails(recommendation)}
              >
                <Brain className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleExpandToggle(recommendation.id)}
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        <Collapsible open={isExpanded}>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="space-y-4">
                {/* Confidence Score */}
                <div>
                  <Label className="text-sm font-medium">AI Confidence Score</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Progress value={recommendation.confidenceScore * 100} className="flex-1" />
                    <span className="text-sm text-muted-foreground">
                      {(recommendation.confidenceScore * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Benefits and Drawbacks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-green-700">Expected Benefits</Label>
                    <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                      {recommendation.benefits.map((benefit, index) => (
                        <li key={index} className="flex items-center space-x-2">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-amber-700">Potential Drawbacks</Label>
                    <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                      {recommendation.drawbacks.map((drawback, index) => (
                        <li key={index} className="flex items-center space-x-2">
                          <AlertTriangle className="h-3 w-3 text-amber-500" />
                          <span>{drawback}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Risk Assessment */}
                <div>
                  <Label className="text-sm font-medium">Risk Assessment</Label>
                  <div className="mt-2">
                    <Badge variant={
                      recommendation.aiReasoning.riskAssessment.overallRisk === 'low' ? 'secondary' :
                      recommendation.aiReasoning.riskAssessment.overallRisk === 'medium' ? 'default' : 'destructive'
                    }>
                      {recommendation.aiReasoning.riskAssessment.overallRisk} risk
                    </Badge>
                    {recommendation.aiReasoning.riskAssessment.riskFactors.map((risk, index) => (
                      <div key={index} className="text-xs text-muted-foreground mt-1">
                        {risk.description}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Implementation Plan Preview */}
                <div>
                  <Label className="text-sm font-medium">Implementation Steps</Label>
                  <div className="mt-2 space-y-2">
                    {recommendation.implementationPlan.slice(0, 2).map((step, index) => (
                      <div key={index} className="flex items-center space-x-2 text-sm">
                        <Badge variant="outline" className="text-xs">
                          {step.step}
                        </Badge>
                        <span className="text-muted-foreground">{step.description}</span>
                        <span className="text-xs text-muted-foreground">({step.estimatedDuration}min)</span>
                      </div>
                    ))}
                    {recommendation.implementationPlan.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{recommendation.implementationPlan.length - 2} more steps
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 pt-2 border-t">
                  <Button
                    size="sm"
                    onClick={() => handleRecommendationAction(recommendation.id, 'approve')}
                    disabled={isProcessing}
                  >
                    <ThumbsUp className="h-3 w-3 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRecommendationAction(recommendation.id, 'reject')}
                    disabled={isProcessing}
                  >
                    <ThumbsDown className="h-3 w-3 mr-1" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRecommendationAction(recommendation.id, 'defer')}
                    disabled={isProcessing}
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    Defer
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => showReasoningDetails(recommendation)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  };

  const renderReasoningDialog = () => {
    if (!selectedRecommendation) return null;

    return (
      <Dialog open={showReasoningDialog} onOpenChange={setShowReasoningDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5" />
              <span>AI Reasoning Analysis</span>
            </DialogTitle>
            <DialogDescription>
              Detailed analysis of how the AI reached this recommendation
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Recommendation Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{selectedRecommendation.description}</CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge variant={getPriorityColor(selectedRecommendation.priority)}>
                    {selectedRecommendation.priority}
                  </Badge>
                  <Badge variant="outline">
                    {selectedRecommendation.type.replace('_', ' ')}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {(selectedRecommendation.confidenceScore * 100).toFixed(1)}% confidence
                  </span>
                </div>
              </CardHeader>
            </Card>

            {/* Reasoning Factors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-4 w-4" />
                  <span>Reasoning Factors</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedRecommendation.aiReasoning.factors.map((factor, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{factor.factor}</h4>
                        <Badge variant="outline">Weight: {factor.weight}</Badge>
                      </div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Progress value={factor.score * 100} className="flex-1" />
                        <span className="text-sm text-muted-foreground">
                          {(factor.score * 100).toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{factor.explanation}</p>
                      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                        <span>Source: {factor.dataSource}</span>
                        <span>Updated: {format(parseISO(factor.lastUpdated), 'MMM dd, yyyy HH:mm')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Confidence Factors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>Confidence Analysis</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedRecommendation.aiReasoning.confidenceFactors.map((factor, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium capitalize">{factor.category.replace('_', ' ')}</h4>
                        <Badge variant={factor.impact === 'positive' ? 'default' : factor.impact === 'negative' ? 'destructive' : 'secondary'}>
                          {factor.impact}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Progress value={factor.score * 100} className="flex-1" />
                        <span className="text-sm text-muted-foreground">
                          {(factor.score * 100).toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{factor.explanation}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Data Quality Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-4 w-4" />
                  <span>Data Quality Assessment</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {Object.entries(selectedRecommendation.aiReasoning.dataQuality).map(([key, value]) => (
                    <div key={key} className="text-center">
                      <div className="text-sm font-medium capitalize">{key}</div>
                      <div className="text-2xl font-bold">{(value * 100).toFixed(0)}%</div>
                      <Progress value={value * 100} className="mt-1" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Alternative Options */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Network className="h-4 w-4" />
                  <span>Alternative Options Considered</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {selectedRecommendation.aiReasoning.alternativeOptions.map((option, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{option.description}</h4>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">Score: {(option.score * 100).toFixed(0)}%</Badge>
                          <Badge variant="outline">Feasibility: {(option.feasibility * 100).toFixed(0)}%</Badge>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <strong>Trade-offs:</strong> {option.tradeoffs.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Implementation Plan */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Code className="h-4 w-4" />
                  <span>Detailed Implementation Plan</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {selectedRecommendation.implementationPlan.map((step, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">Step {step.step}: {step.description}</h4>
                        <Badge variant="outline">{step.estimatedDuration}min</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div>
                          <strong>Responsible:</strong> {step.responsibleParty}
                        </div>
                        <div>
                          <strong>Resources:</strong> {step.resources.join(', ')}
                        </div>
                        {step.dependencies.length > 0 && (
                          <div>
                            <strong>Dependencies:</strong> {step.dependencies.join(', ')}
                          </div>
                        )}
                        <div>
                          <strong>Validation:</strong> {step.validationCriteria.join(', ')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">AI Recommendations</h2>
          <p className="text-muted-foreground">
            Review AI-generated scheduling recommendations with detailed reasoning
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button onClick={onRegenerateRecommendations} disabled={isProcessing}>
            {isProcessing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            Regenerate
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Recommendations</CardTitle>
              <Lightbulb className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredRecommendations.length}</div>
              <p className="text-xs text-muted-foreground">
                {selectedRecommendations.length} selected
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Confidence</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {filteredRecommendations.length > 0 
                  ? (filteredRecommendations.reduce((sum, rec) => sum + rec.confidenceScore, 0) / filteredRecommendations.length * 100).toFixed(1)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Across all recommendations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Priority</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {filteredRecommendations.filter(rec => rec.priority === 'high' || rec.priority === 'urgent').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Requiring immediate attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Students Impacted</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {filteredRecommendations.reduce((sum, rec) => sum + rec.impactAnalysis.studentsAffected, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                If all recommendations applied
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search recommendations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="confidence">Confidence</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="impact">Impact</SelectItem>
              <SelectItem value="complexity">Complexity</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'desc' ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
          </Button>
        </div>

        {selectedRecommendations.length > 0 && (
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              onClick={() => handleBulkAction('approve')}
              disabled={isProcessing}
            >
              <ThumbsUp className="h-4 w-4 mr-2" />
              Approve Selected ({selectedRecommendations.length})
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('reject')}
              disabled={isProcessing}
            >
              <ThumbsDown className="h-4 w-4 mr-2" />
              Reject Selected
            </Button>
          </div>
        )}
      </div>

      {/* Recommendations List */}
      <div className="space-y-4">
        {filteredRecommendations.map(rec => renderRecommendationCard(rec))}
        
        {filteredRecommendations.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No recommendations found</h3>
              <p className="text-muted-foreground">
                No recommendations match your current filters. Try adjusting your search criteria.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Reasoning Dialog */}
      {renderReasoningDialog()}
    </div>
  );
}