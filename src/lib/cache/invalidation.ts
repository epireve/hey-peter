/**
 * Cache invalidation strategies and utilities
 * Provides sophisticated cache invalidation patterns for maintaining data consistency
 */

import { CacheInvalidationRule, CacheManager, CacheEvent } from './types';

export interface InvalidationEvent {
  type: 'mutation' | 'time' | 'dependency' | 'manual';
  source: string;
  affectedKeys: string[];
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface InvalidationRule {
  id: string;
  pattern: string | RegExp;
  trigger: InvalidationTrigger;
  priority: 'low' | 'medium' | 'high' | 'critical';
  active: boolean;
  conditions?: InvalidationCondition[];
}

export interface InvalidationTrigger {
  type: 'time' | 'event' | 'mutation' | 'dependency' | 'size' | 'memory';
  config: {
    // Time-based
    interval?: number;
    cron?: string;
    
    // Event-based
    events?: string[];
    
    // Mutation-based
    mutations?: string[];
    mutationPattern?: RegExp;
    
    // Dependency-based
    dependencies?: string[];
    
    // Size-based
    maxSize?: number;
    maxEntries?: number;
    
    // Memory-based
    memoryThreshold?: number;
  };
}

export interface InvalidationCondition {
  type: 'age' | 'usage' | 'size' | 'custom';
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number | string | ((entry: any) => boolean);
}

/**
 * Cache invalidation manager
 */
export class CacheInvalidationManager {
  private rules = new Map<string, InvalidationRule>();
  private listeners = new Set<(event: InvalidationEvent) => void>();
  private cacheManager: CacheManager;
  private timers = new Map<string, NodeJS.Timeout>();
  private mutationTracking = new Map<string, Set<string>>();

  constructor(cacheManager: CacheManager) {
    this.cacheManager = cacheManager;
    this.setupDefaultRules();
  }

  /**
   * Add invalidation rule
   */
  addRule(rule: InvalidationRule): void {
    this.rules.set(rule.id, rule);
    this.setupRuleTrigger(rule);
  }

  /**
   * Remove invalidation rule
   */
  removeRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      this.cleanupRuleTrigger(rule);
      this.rules.delete(ruleId);
    }
  }

  /**
   * Update rule activation status
   */
  toggleRule(ruleId: string, active: boolean): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.active = active;
      if (active) {
        this.setupRuleTrigger(rule);
      } else {
        this.cleanupRuleTrigger(rule);
      }
    }
  }

  /**
   * Manually trigger invalidation
   */
  async invalidate(pattern: string | RegExp, source: string = 'manual'): Promise<string[]> {
    const affectedKeys = await this.findMatchingKeys(pattern);
    
    if (affectedKeys.length > 0) {
      await Promise.all(
        affectedKeys.map(key => this.cacheManager.delete(key))
      );

      const event: InvalidationEvent = {
        type: 'manual',
        source,
        affectedKeys,
        timestamp: Date.now()
      };

      this.emitInvalidationEvent(event);
    }

    return affectedKeys;
  }

  /**
   * Invalidate by tags
   */
  async invalidateByTags(tags: string[]): Promise<string[]> {
    const allKeys: string[] = [];
    
    for (const tag of tags) {
      const keys = await this.findKeysWithTag(tag);
      allKeys.push(...keys);
    }

    const uniqueKeys = [...new Set(allKeys)];
    
    if (uniqueKeys.length > 0) {
      await Promise.all(
        uniqueKeys.map(key => this.cacheManager.delete(key))
      );

      const event: InvalidationEvent = {
        type: 'manual',
        source: 'tags',
        affectedKeys: uniqueKeys,
        timestamp: Date.now(),
        metadata: { tags }
      };

      this.emitInvalidationEvent(event);
    }

    return uniqueKeys;
  }

  /**
   * Track mutation for dependency invalidation
   */
  trackMutation(mutationKey: string, affectedCacheKeys: string[]): void {
    if (!this.mutationTracking.has(mutationKey)) {
      this.mutationTracking.set(mutationKey, new Set());
    }
    
    const trackedKeys = this.mutationTracking.get(mutationKey)!;
    affectedCacheKeys.forEach(key => trackedKeys.add(key));

    // Trigger rules that listen for this mutation
    this.processMutationRules(mutationKey);
  }

  /**
   * Subscribe to invalidation events
   */
  onInvalidation(listener: (event: InvalidationEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get all active rules
   */
  getRules(): InvalidationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get invalidation statistics
   */
  getStats(): {
    totalRules: number;
    activeRules: number;
    totalInvalidations: number;
    rulesByType: Record<string, number>;
  } {
    const activeRules = Array.from(this.rules.values()).filter(rule => rule.active);
    const rulesByType = activeRules.reduce((acc, rule) => {
      acc[rule.trigger.type] = (acc[rule.trigger.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalRules: this.rules.size,
      activeRules: activeRules.length,
      totalInvalidations: 0, // Would track this in a real implementation
      rulesByType
    };
  }

  private setupDefaultRules(): void {
    // Rule to invalidate student data when student is updated
    this.addRule({
      id: 'student-data-mutation',
      pattern: /^students:.*$/,
      trigger: {
        type: 'mutation',
        config: {
          mutations: ['updateStudent', 'deleteStudent', 'createStudent']
        }
      },
      priority: 'high',
      active: true
    });

    // Rule to invalidate analytics data daily
    this.addRule({
      id: 'analytics-daily-refresh',
      pattern: /^analytics:.*$/,
      trigger: {
        type: 'time',
        config: {
          interval: 24 * 60 * 60 * 1000 // 24 hours
        }
      },
      priority: 'medium',
      active: true
    });

    // Rule to invalidate old cache entries
    this.addRule({
      id: 'stale-data-cleanup',
      pattern: /.*$/,
      trigger: {
        type: 'time',
        config: {
          interval: 60 * 60 * 1000 // 1 hour
        }
      },
      priority: 'low',
      active: true,
      conditions: [
        {
          type: 'age',
          operator: 'gt',
          value: 7 * 24 * 60 * 60 * 1000 // 7 days
        }
      ]
    });

    // Rule to manage cache size
    this.addRule({
      id: 'cache-size-management',
      pattern: /.*$/,
      trigger: {
        type: 'size',
        config: {
          maxEntries: 1000
        }
      },
      priority: 'medium',
      active: true
    });
  }

  private setupRuleTrigger(rule: InvalidationRule): void {
    if (!rule.active) return;

    switch (rule.trigger.type) {
      case 'time':
        this.setupTimeBasedRule(rule);
        break;
      case 'event':
        this.setupEventBasedRule(rule);
        break;
      case 'mutation':
        this.setupMutationBasedRule(rule);
        break;
      case 'dependency':
        this.setupDependencyBasedRule(rule);
        break;
      case 'size':
        this.setupSizeBasedRule(rule);
        break;
    }
  }

  private cleanupRuleTrigger(rule: InvalidationRule): void {
    const timer = this.timers.get(rule.id);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(rule.id);
    }
  }

  private setupTimeBasedRule(rule: InvalidationRule): void {
    const { interval } = rule.trigger.config;
    if (!interval) return;

    const timer = setInterval(async () => {
      try {
        await this.processRule(rule, 'time');
      } catch (error) {
        console.error(`Error processing time-based rule ${rule.id}:`, error);
      }
    }, interval);

    this.timers.set(rule.id, timer);
  }

  private setupEventBasedRule(rule: InvalidationRule): void {
    const { events } = rule.trigger.config;
    if (!events) return;

    // In a real implementation, this would integrate with your event system
    console.log(`Event-based rule ${rule.id} would listen for events:`, events);
  }

  private setupMutationBasedRule(rule: InvalidationRule): void {
    // Mutation tracking is handled in trackMutation method
    console.log(`Mutation-based rule ${rule.id} is ready`);
  }

  private setupDependencyBasedRule(rule: InvalidationRule): void {
    const { dependencies } = rule.trigger.config;
    if (!dependencies) return;

    // In a real implementation, this would set up dependency tracking
    console.log(`Dependency-based rule ${rule.id} tracking:`, dependencies);
  }

  private setupSizeBasedRule(rule: InvalidationRule): void {
    const timer = setInterval(async () => {
      try {
        const metrics = await this.cacheManager.getMetrics();
        const { maxEntries, maxSize } = rule.trigger.config;

        if (maxEntries && metrics.totalEntries > maxEntries) {
          await this.processRule(rule, 'size');
        }

        if (maxSize && metrics.totalSize > maxSize) {
          await this.processRule(rule, 'size');
        }
      } catch (error) {
        console.error(`Error processing size-based rule ${rule.id}:`, error);
      }
    }, 60000); // Check every minute

    this.timers.set(rule.id, timer);
  }

  private async processRule(rule: InvalidationRule, triggerType: string): Promise<void> {
    const affectedKeys = await this.findMatchingKeys(rule.pattern);
    
    // Apply conditions if specified
    const filteredKeys = rule.conditions
      ? await this.filterKeysByConditions(affectedKeys, rule.conditions)
      : affectedKeys;

    if (filteredKeys.length > 0) {
      await Promise.all(
        filteredKeys.map(key => this.cacheManager.delete(key))
      );

      const event: InvalidationEvent = {
        type: triggerType as any,
        source: rule.id,
        affectedKeys: filteredKeys,
        timestamp: Date.now(),
        metadata: { ruleId: rule.id, priority: rule.priority }
      };

      this.emitInvalidationEvent(event);
    }
  }

  private async processMutationRules(mutationKey: string): Promise<void> {
    const relevantRules = Array.from(this.rules.values()).filter(rule => 
      rule.active &&
      rule.trigger.type === 'mutation' &&
      (rule.trigger.config.mutations?.includes(mutationKey) ||
       (rule.trigger.config.mutationPattern && rule.trigger.config.mutationPattern.test(mutationKey)))
    );

    for (const rule of relevantRules) {
      await this.processRule(rule, 'mutation');
    }
  }

  private async findMatchingKeys(pattern: string | RegExp): Promise<string[]> {
    // This would typically use the cache manager's key listing functionality
    // For now, we'll simulate it
    try {
      // Assuming cache manager has a method to get all keys
      const allKeys: string[] = []; // await this.cacheManager.getAllKeys();
      
      if (typeof pattern === 'string') {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return allKeys.filter(key => regex.test(key));
      } else {
        return allKeys.filter(key => pattern.test(key));
      }
    } catch (error) {
      console.error('Error finding matching keys:', error);
      return [];
    }
  }

  private async findKeysWithTag(tag: string): Promise<string[]> {
    // This would integrate with your tagging system
    // For now, return empty array
    return [];
  }

  private async filterKeysByConditions(keys: string[], conditions: InvalidationCondition[]): Promise<string[]> {
    const filteredKeys: string[] = [];

    for (const key of keys) {
      let shouldInclude = true;

      for (const condition of conditions) {
        if (!await this.evaluateCondition(key, condition)) {
          shouldInclude = false;
          break;
        }
      }

      if (shouldInclude) {
        filteredKeys.push(key);
      }
    }

    return filteredKeys;
  }

  private async evaluateCondition(key: string, condition: InvalidationCondition): Promise<boolean> {
    try {
      const entry = await this.cacheManager.get(key);
      if (!entry) return false;

      switch (condition.type) {
        case 'age':
          const age = Date.now() - (entry as any).timestamp;
          return this.compareValues(age, condition.operator, condition.value as number);
        
        case 'size':
          const size = JSON.stringify(entry).length;
          return this.compareValues(size, condition.operator, condition.value as number);
        
        case 'custom':
          if (typeof condition.value === 'function') {
            return condition.value(entry);
          }
          return false;
        
        default:
          return false;
      }
    } catch (error) {
      console.error(`Error evaluating condition for key ${key}:`, error);
      return false;
    }
  }

  private compareValues(actual: number, operator: string, expected: number): boolean {
    switch (operator) {
      case 'gt': return actual > expected;
      case 'lt': return actual < expected;
      case 'eq': return actual === expected;
      case 'gte': return actual >= expected;
      case 'lte': return actual <= expected;
      default: return false;
    }
  }

  private emitInvalidationEvent(event: InvalidationEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in invalidation event listener:', error);
      }
    });
  }
}

/**
 * Predefined invalidation strategies
 */
export const InvalidationStrategies = {
  /**
   * Time-based invalidation with exponential backoff
   */
  timeBasedExponentialBackoff: (baseInterval: number = 60000) => ({
    id: 'time-exponential-backoff',
    pattern: /.*$/,
    trigger: {
      type: 'time' as const,
      config: { interval: baseInterval }
    },
    priority: 'low' as const,
    active: true
  }),

  /**
   * LRU-style invalidation based on usage
   */
  leastRecentlyUsed: (maxEntries: number = 1000) => ({
    id: 'lru-invalidation',
    pattern: /.*$/,
    trigger: {
      type: 'size' as const,
      config: { maxEntries }
    },
    priority: 'medium' as const,
    active: true,
    conditions: [
      {
        type: 'usage' as const,
        operator: 'lt' as const,
        value: Date.now() - 24 * 60 * 60 * 1000 // 24 hours
      }
    ]
  }),

  /**
   * Mutation-based invalidation for specific entities
   */
  entityMutation: (entityType: string, mutations: string[]) => ({
    id: `${entityType}-mutation-invalidation`,
    pattern: new RegExp(`^${entityType}:.*$`),
    trigger: {
      type: 'mutation' as const,
      config: { mutations }
    },
    priority: 'high' as const,
    active: true
  }),

  /**
   * Dependency-based invalidation cascade
   */
  dependencyCascade: (dependencies: string[]) => ({
    id: 'dependency-cascade',
    pattern: /.*$/,
    trigger: {
      type: 'dependency' as const,
      config: { dependencies }
    },
    priority: 'high' as const,
    active: true
  }),

  /**
   * Memory pressure-based invalidation
   */
  memoryPressure: (threshold: number = 0.8) => ({
    id: 'memory-pressure-invalidation',
    pattern: /.*$/,
    trigger: {
      type: 'memory' as const,
      config: { memoryThreshold: threshold }
    },
    priority: 'critical' as const,
    active: true,
    conditions: [
      {
        type: 'age' as const,
        operator: 'gt' as const,
        value: 60 * 60 * 1000 // 1 hour
      }
    ]
  })
};

/**
 * Cache invalidation hooks for React components
 */
export function useInvalidationManager(cacheManager: CacheManager) {
  const [manager] = React.useState(() => new CacheInvalidationManager(cacheManager));
  const [stats, setStats] = React.useState(manager.getStats());

  React.useEffect(() => {
    const unsubscribe = manager.onInvalidation(() => {
      setStats(manager.getStats());
    });

    return unsubscribe;
  }, [manager]);

  const invalidate = React.useCallback(async (pattern: string | RegExp) => {
    return manager.invalidate(pattern);
  }, [manager]);

  const invalidateByTags = React.useCallback(async (tags: string[]) => {
    return manager.invalidateByTags(tags);
  }, [manager]);

  const trackMutation = React.useCallback((mutationKey: string, affectedKeys: string[]) => {
    manager.trackMutation(mutationKey, affectedKeys);
  }, [manager]);

  return {
    manager,
    stats,
    invalidate,
    invalidateByTags,
    trackMutation
  };
}

// Import React for hooks
import React from 'react';