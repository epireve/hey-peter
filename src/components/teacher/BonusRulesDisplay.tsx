"use client";

import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Star,
  Clock,
  Users,
  TrendingUp,
  Award,
  Target,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
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
import { cn } from '@/lib/utils';

interface BonusCriteria {
  requirement: string;
  met: boolean;
}

interface BonusStatus {
  eligible: boolean;
  currentValue: number;
  targetValue: number;
  progress: number;
}

interface BonusRule {
  name: string;
  description: string;
  criteria: BonusCriteria[];
  amount: number;
  frequency: string;
  currentStatus: BonusStatus;
}

interface BonusHistory {
  month: string;
  bonuses: string[];
  total: number;
}

interface BonusRulesDisplayProps {
  bonusRules?: Record<string, BonusRule>;
  teacherId: string;
  variant?: 'detailed' | 'summary' | 'compact';
  isLoading?: boolean;
  showFilters?: boolean;
  showTips?: boolean;
  showHistory?: boolean;
  showTooltips?: boolean;
  bonusHistory?: BonusHistory[];
  onBonusClick?: (bonusId: string) => void;
}

export function BonusRulesDisplay({
  bonusRules,
  teacherId,
  variant = 'detailed',
  isLoading = false,
  showFilters = false,
  showTips = false,
  showHistory = false,
  showTooltips = false,
  bonusHistory,
  onBonusClick,
}: BonusRulesDisplayProps) {
  const [expandedBonuses, setExpandedBonuses] = useState<Record<string, boolean>>({});
  const [filterEligible, setFilterEligible] = useState(false);

  const toggleExpanded = (bonusId: string) => {
    setExpandedBonuses(prev => ({
      ...prev,
      [bonusId]: !prev[bonusId],
    }));
  };

  const getBonusIcon = (bonusKey: string) => {
    switch (bonusKey) {
      case 'studentSatisfaction':
        return <Star className="h-5 w-5" />;
      case 'attendance':
        return <Clock className="h-5 w-5" />;
      case 'extraHours':
        return <TrendingUp className="h-5 w-5" />;
      case 'performance':
        return <Award className="h-5 w-5" />;
      case 'referral':
        return <Users className="h-5 w-5" />;
      default:
        return <Trophy className="h-5 w-5" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return `RM ${amount.toLocaleString()}`;
  };

  const filteredBonuses = useMemo(() => {
    if (!bonusRules) return {};
    if (!filterEligible) return bonusRules;
    
    return Object.fromEntries(
      Object.entries(bonusRules).filter(([_, rule]) => rule.currentStatus.eligible)
    );
  }, [bonusRules, filterEligible]);

  const totalEligibleBonuses = useMemo(() => {
    if (!bonusRules) return 0;
    return Object.values(bonusRules)
      .filter(rule => rule.currentStatus.eligible)
      .reduce((sum, rule) => sum + rule.amount, 0);
  }, [bonusRules]);

  const totalPotentialBonuses = useMemo(() => {
    if (!bonusRules) return 0;
    return Object.values(bonusRules).reduce((sum, rule) => sum + rule.amount, 0);
  }, [bonusRules]);

  if (isLoading) {
    return (
      <div data-testid="bonus-rules-loading" className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!bonusRules || Object.keys(bonusRules).length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No bonus rules available</p>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'summary') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bonus Summary</CardTitle>
          <CardDescription>Your current bonus eligibility</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium">Total Eligible Bonuses</span>
              <span className="text-2xl font-bold text-green-600">
                {formatCurrency(totalEligibleBonuses)}
              </span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Total Potential</span>
              <span>{formatCurrency(totalPotentialBonuses)}</span>
            </div>
            <Progress value={(totalEligibleBonuses / totalPotentialBonuses) * 100} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Bonus Rules & Eligibility</h2>
          {showFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterEligible(!filterEligible)}
            >
              {filterEligible ? 'Show All' : 'Eligible Only'}
            </Button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Eligible Bonuses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalEligibleBonuses)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Potential</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalPotentialBonuses)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Bonus Rules */}
        <div className="space-y-4">
          {Object.entries(filteredBonuses).map(([bonusKey, rule]) => {
            const isNearMiss = rule.currentStatus.progress >= 90 && !rule.currentStatus.eligible;
            const isExpanded = expandedBonuses[bonusKey];

            return (
              <Card
                key={bonusKey}
                role="article"
                className={cn(
                  "transition-all",
                  isNearMiss && "border-yellow-500",
                  variant === 'compact' && "p-4"
                )}
              >
                <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(bonusKey)}>
                  <CollapsibleTrigger asChild>
                    <button
                      className="w-full cursor-pointer text-left"
                      onClick={() => onBonusClick?.(bonusKey)}
                    >
                      <CardHeader className="w-full">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            {getBonusIcon(bonusKey)}
                            <div className="text-left">
                              <CardTitle className="text-lg">{rule.name}</CardTitle>
                              {variant !== 'compact' && (
                                <CardDescription>{rule.description}</CardDescription>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              {showTooltips ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-xl font-bold cursor-help">
                                      {formatCurrency(rule.amount)}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Paid {rule.frequency}</p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <span className="text-xl font-bold">{formatCurrency(rule.amount)}</span>
                              )}
                              <p className="text-sm text-muted-foreground">{rule.frequency}</p>
                            </div>
                            <Badge
                              variant={rule.currentStatus.eligible ? 'default' : 'secondary'}
                              className="ml-2"
                            >
                              {rule.currentStatus.eligible ? 'Eligible' : 'Not Eligible'}
                            </Badge>
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Progress</span>
                            <span>
                              {rule.currentStatus.currentValue} / {rule.currentStatus.targetValue}
                            </span>
                          </div>
                          <Progress value={rule.currentStatus.progress} className="h-2" />
                        </div>
                      </CardHeader>
                    </button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm">Requirements</h4>
                        <ul className="space-y-2">
                          {rule.criteria.map((criterion, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-sm">
                              {criterion.met ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )}
                              <span className={criterion.met ? 'text-green-600' : 'text-muted-foreground'}>
                                {criterion.requirement}
                              </span>
                            </li>
                          ))}
                        </ul>
                        
                        {showTips && !rule.currentStatus.eligible && (
                          <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                            <div className="text-sm font-medium flex items-center gap-2">
                              <AlertCircle className="h-4 w-4" />
                              Tips to improve
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              Focus on meeting the unmet requirements to become eligible for this bonus.
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>

        {/* Bonus History */}
        {showHistory && bonusHistory && (
          <Card>
            <CardHeader>
              <CardTitle>Bonus History</CardTitle>
              <CardDescription>Your bonus earnings over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bonusHistory.map((record, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{record.month}</p>
                      <p className="text-sm text-muted-foreground">
                        {record.bonuses.join(', ')}
                      </p>
                    </div>
                    <span className="font-semibold">{formatCurrency(record.total)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}