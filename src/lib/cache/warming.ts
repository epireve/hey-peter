import { logger } from '@/lib/services';
/**
 * Cache warming strategies for critical data
 * Proactively loads important data to improve user experience
 */

import { CacheEntry, CacheStorage, CacheWarmingRule } from './types';
import { performanceMonitor } from '@/lib/utils/performance-monitor';

export interface WarmingStrategy {
  id: string;
  name: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  execute: (context: WarmingContext) => Promise<WarmingResult>;
}

export interface WarmingContext {
  storage: CacheStorage;
  userId?: string;
  userRole?: string;
  currentRoute?: string;
  sessionData?: Record<string, any>;
  preferences?: Record<string, any>;
  analytics?: {
    mostVisitedPages: string[];
    frequentlyUsedFeatures: string[];
    userBehaviorPatterns: Record<string, any>;
  };
}

export interface WarmingResult {
  strategy: string;
  success: boolean;
  itemsWarmed: number;
  totalItems: number;
  duration: number;
  errors: string[];
  metadata?: Record<string, any>;
}

export interface WarmingConfig {
  /** Maximum concurrent warming operations */
  maxConcurrency: number;
  /** Timeout for individual warming operations */
  operationTimeout: number;
  /** Whether to warm cache on app startup */
  warmOnStartup: boolean;
  /** Whether to warm cache on user authentication */
  warmOnAuth: boolean;
  /** Whether to warm cache on route changes */
  warmOnRouteChange: boolean;
  /** Minimum time between warming cycles */
  minWarmingInterval: number;
  /** Maximum cache size for warming */
  maxWarmingCacheSize: number;
  /** Whether to use predictive warming */
  enablePredictiveWarming: boolean;
}

/**
 * Cache warming manager
 */
export class CacheWarmingManager {
  private strategies = new Map<string, WarmingStrategy>();
  private rules = new Map<string, CacheWarmingRule>();
  private storage: CacheStorage;
  private config: WarmingConfig;
  private isWarming = false;
  private lastWarmingTime = 0;
  private warmingQueue: Array<{ strategy: WarmingStrategy; context: WarmingContext }> = [];

  constructor(storage: CacheStorage, config: Partial<WarmingConfig> = {}) {
    this.storage = storage;
    this.config = {
      maxConcurrency: 3,
      operationTimeout: 30000,
      warmOnStartup: true,
      warmOnAuth: true,
      warmOnRouteChange: false,
      minWarmingInterval: 60000, // 1 minute
      maxWarmingCacheSize: 50 * 1024 * 1024, // 50MB
      enablePredictiveWarming: true,
      ...config
    };

    this.setupDefaultStrategies();
  }

  /**
   * Register a warming strategy
   */
  registerStrategy(strategy: WarmingStrategy): void {
    this.strategies.set(strategy.id, strategy);
  }

  /**
   * Remove a warming strategy
   */
  unregisterStrategy(strategyId: string): void {
    this.strategies.delete(strategyId);
  }

  /**
   * Add a warming rule
   */
  addRule(rule: CacheWarmingRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove a warming rule
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  /**
   * Execute warming based on trigger
   */
  async executeWarming(
    trigger: 'startup' | 'auth' | 'route' | 'scheduled' | 'manual',
    context: Partial<WarmingContext> = {}
  ): Promise<WarmingResult[]> {
    if (this.isWarming) {
      logger.info('Cache warming already in progress, skipping');
      return [];
    }

    // Check minimum interval
    const now = Date.now();
    if (now - this.lastWarmingTime < this.config.minWarmingInterval) {
      logger.info('Cache warming interval not met, skipping');
      return [];
    }

    this.isWarming = true;
    this.lastWarmingTime = now;

    try {
      const fullContext: WarmingContext = {
        storage: this.storage,
        ...context
      };

      // Find applicable rules
      const applicableRules = Array.from(this.rules.values()).filter(rule => 
        rule.active && this.shouldTriggerRule(rule, trigger, fullContext)
      );

      // Get strategies for applicable rules
      const strategiesToExecute = new Set<WarmingStrategy>();
      
      for (const rule of applicableRules) {
        if (typeof rule.keys === 'function') {
          // Dynamic key generation - use predictive strategy
          const predictiveStrategy = this.strategies.get('predictive');
          if (predictiveStrategy) {
            strategiesToExecute.add(predictiveStrategy);
          }
        } else {
          // Static keys - use appropriate strategy based on priority
          const strategy = this.selectStrategyForRule(rule);
          if (strategy) {
            strategiesToExecute.add(strategy);
          }
        }
      }

      // Sort strategies by priority
      const sortedStrategies = Array.from(strategiesToExecute).sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      // Execute strategies with concurrency control
      const results = await this.executeStrategiesWithConcurrency(sortedStrategies, fullContext);

      logger.info(`Cache warming completed: ${results.length} strategies executed`);
      return results;

    } catch (error) {
      logger.error('Cache warming failed:', error);
      return [];
    } finally {
      this.isWarming = false;
    }
  }

  /**
   * Warm specific keys
   */
  async warmKeys(
    keys: string[],
    fetchers: Record<string, () => Promise<any>>,
    priority: WarmingStrategy['priority'] = 'medium'
  ): Promise<WarmingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let itemsWarmed = 0;

    try {
      // Process keys in batches
      const batchSize = this.config.maxConcurrency;
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(async (key) => {
            try {
              // Check if already cached
              const exists = await this.storage.has(key);
              if (exists) {
                return;
              }

              const fetcher = fetchers[key];
              if (!fetcher) {
                errors.push(`No fetcher provided for key: ${key}`);
                return;
              }

              const data = await Promise.race([
                fetcher(),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Timeout')), this.config.operationTimeout)
                )
              ]);

              const entry: CacheEntry<any> = {
                data,
                timestamp: Date.now(),
                ttl: this.getTTLForPriority(priority),
                metadata: {
                  source: 'warming',
                  priority,
                  warmingTime: Date.now()
                }
              };

              await this.storage.set(key, entry);
              itemsWarmed++;

            } catch (error) {
              errors.push(`Failed to warm ${key}: ${error.message}`);
            }
          })
        );
      }

      return {
        strategy: 'manual',
        success: errors.length === 0,
        itemsWarmed,
        totalItems: keys.length,
        duration: Date.now() - startTime,
        errors
      };

    } catch (error) {
      return {
        strategy: 'manual',
        success: false,
        itemsWarmed,
        totalItems: keys.length,
        duration: Date.now() - startTime,
        errors: [error.message]
      };
    }
  }

  /**
   * Get warming statistics
   */
  async getStats(): Promise<{
    totalStrategies: number;
    activeRules: number;
    isWarming: boolean;
    lastWarmingTime: number;
    queueSize: number;
    cacheSize: number;
  }> {
    const cacheSize = await this.storage.size();
    
    return {
      totalStrategies: this.strategies.size,
      activeRules: Array.from(this.rules.values()).filter(r => r.active).length,
      isWarming: this.isWarming,
      lastWarmingTime: this.lastWarmingTime,
      queueSize: this.warmingQueue.length,
      cacheSize
    };
  }

  private setupDefaultStrategies(): void {
    // Critical data strategy - user profile, preferences, navigation data
    this.registerStrategy({
      id: 'critical-data',
      name: 'Critical Data Warming',
      description: 'Warms essential user data and navigation information',
      priority: 'critical',
      execute: async (context) => {
        const startTime = Date.now();
        const errors: string[] = [];
        let itemsWarmed = 0;

        try {
          const criticalKeys = [
            `user:${context.userId}:profile`,
            `user:${context.userId}:preferences`,
            `user:${context.userId}:permissions`,
            'navigation:menu',
            'app:config'
          ];

          const fetchers = this.getCriticalDataFetchers(context);
          
          for (const key of criticalKeys) {
            try {
              const exists = await this.storage.has(key);
              if (!exists && fetchers[key]) {
                const data = await fetchers[key]();
                await this.cacheData(key, data, 'critical');
                itemsWarmed++;
              }
            } catch (error) {
              errors.push(`Failed to warm ${key}: ${error.message}`);
            }
          }

          return {
            strategy: 'critical-data',
            success: errors.length === 0,
            itemsWarmed,
            totalItems: criticalKeys.length,
            duration: Date.now() - startTime,
            errors
          };

        } catch (error) {
          return {
            strategy: 'critical-data',
            success: false,
            itemsWarmed,
            totalItems: 0,
            duration: Date.now() - startTime,
            errors: [error.message]
          };
        }
      }
    });

    // Route-based strategy - preload data for likely next routes
    this.registerStrategy({
      id: 'route-prediction',
      name: 'Route Prediction Warming',
      description: 'Preloads data for likely next routes based on current context',
      priority: 'high',
      execute: async (context) => {
        const startTime = Date.now();
        const errors: string[] = [];
        let itemsWarmed = 0;

        try {
          const predictedRoutes = this.predictNextRoutes(context);
          const routeDataFetchers = this.getRouteDataFetchers(context);

          for (const route of predictedRoutes) {
            try {
              const cacheKey = `route:${route}:data`;
              const exists = await this.storage.has(cacheKey);
              
              if (!exists && routeDataFetchers[route]) {
                const data = await routeDataFetchers[route]();
                await this.cacheData(cacheKey, data, 'high');
                itemsWarmed++;
              }
            } catch (error) {
              errors.push(`Failed to warm route ${route}: ${error.message}`);
            }
          }

          return {
            strategy: 'route-prediction',
            success: errors.length === 0,
            itemsWarmed,
            totalItems: predictedRoutes.length,
            duration: Date.now() - startTime,
            errors
          };

        } catch (error) {
          return {
            strategy: 'route-prediction',
            success: false,
            itemsWarmed,
            totalItems: 0,
            duration: Date.now() - startTime,
            errors: [error.message]
          };
        }
      }
    });

    // Analytics-based strategy - preload frequently accessed data
    this.registerStrategy({
      id: 'analytics-based',
      name: 'Analytics-Based Warming',
      description: 'Preloads data based on user behavior analytics',
      priority: 'medium',
      execute: async (context) => {
        const startTime = Date.now();
        const errors: string[] = [];
        let itemsWarmed = 0;

        try {
          if (!context.analytics) {
            return {
              strategy: 'analytics-based',
              success: true,
              itemsWarmed: 0,
              totalItems: 0,
              duration: Date.now() - startTime,
              errors: ['No analytics data available']
            };
          }

          const frequentDataKeys = this.getFrequentDataKeys(context.analytics);
          const analyticsDataFetchers = this.getAnalyticsDataFetchers(context);

          for (const key of frequentDataKeys) {
            try {
              const exists = await this.storage.has(key);
              
              if (!exists && analyticsDataFetchers[key]) {
                const data = await analyticsDataFetchers[key]();
                await this.cacheData(key, data, 'medium');
                itemsWarmed++;
              }
            } catch (error) {
              errors.push(`Failed to warm analytics data ${key}: ${error.message}`);
            }
          }

          return {
            strategy: 'analytics-based',
            success: errors.length === 0,
            itemsWarmed,
            totalItems: frequentDataKeys.length,
            duration: Date.now() - startTime,
            errors
          };

        } catch (error) {
          return {
            strategy: 'analytics-based',
            success: false,
            itemsWarmed,
            totalItems: 0,
            duration: Date.now() - startTime,
            errors: [error.message]
          };
        }
      }
    });

    // Predictive strategy - ML-based predictions for what user might need
    this.registerStrategy({
      id: 'predictive',
      name: 'Predictive Warming',
      description: 'Uses machine learning to predict and preload data',
      priority: 'low',
      execute: async (context) => {
        const startTime = Date.now();
        const errors: string[] = [];
        let itemsWarmed = 0;

        try {
          // Simplified predictive logic - in practice, this would use ML models
          const predictions = await this.generatePredictions(context);
          const predictiveDataFetchers = this.getPredictiveDataFetchers(context);

          for (const prediction of predictions) {
            try {
              const exists = await this.storage.has(prediction.key);
              
              if (!exists && 
                  prediction.confidence > 0.7 && 
                  predictiveDataFetchers[prediction.type]) {
                
                const data = await predictiveDataFetchers[prediction.type](prediction.params);
                await this.cacheData(prediction.key, data, 'low');
                itemsWarmed++;
              }
            } catch (error) {
              errors.push(`Failed to warm prediction ${prediction.key}: ${error.message}`);
            }
          }

          return {
            strategy: 'predictive',
            success: errors.length === 0,
            itemsWarmed,
            totalItems: predictions.length,
            duration: Date.now() - startTime,
            errors,
            metadata: { predictions }
          };

        } catch (error) {
          return {
            strategy: 'predictive',
            success: false,
            itemsWarmed,
            totalItems: 0,
            duration: Date.now() - startTime,
            errors: [error.message]
          };
        }
      }
    });
  }

  private shouldTriggerRule(
    rule: CacheWarmingRule,
    trigger: string,
    context: WarmingContext
  ): boolean {
    const { triggers } = rule;

    switch (trigger) {
      case 'startup':
        return triggers.startup === true;
      case 'auth':
        return triggers.userAuth === true;
      case 'route':
        return triggers.routeChange?.includes(context.currentRoute || '') === true;
      case 'scheduled':
        // This would check cron expressions in a real implementation
        return false;
      case 'manual':
        return true;
      default:
        return false;
    }
  }

  private selectStrategyForRule(rule: CacheWarmingRule): WarmingStrategy | null {
    // Select strategy based on rule priority and available strategies
    const priorityStrategyMap = {
      critical: 'critical-data',
      high: 'route-prediction',
      medium: 'analytics-based',
      low: 'predictive'
    };

    const strategyId = priorityStrategyMap[rule.priority];
    return this.strategies.get(strategyId) || null;
  }

  private async executeStrategiesWithConcurrency(
    strategies: WarmingStrategy[],
    context: WarmingContext
  ): Promise<WarmingResult[]> {
    const results: WarmingResult[] = [];
    const batchSize = this.config.maxConcurrency;

    for (let i = 0; i < strategies.length; i += batchSize) {
      const batch = strategies.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(strategy => 
          performanceMonitor.trackAPI(
            `warming:${strategy.id}`,
            () => strategy.execute(context),
            { strategy: strategy.id, priority: strategy.priority }
          )
        )
      );

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            strategy: batch[index].id,
            success: false,
            itemsWarmed: 0,
            totalItems: 0,
            duration: 0,
            errors: [result.reason.message]
          });
        }
      });
    }

    return results;
  }

  private getTTLForPriority(priority: WarmingStrategy['priority']): number {
    const ttlMap = {
      critical: 24 * 60 * 60 * 1000, // 24 hours
      high: 12 * 60 * 60 * 1000,     // 12 hours
      medium: 6 * 60 * 60 * 1000,    // 6 hours
      low: 2 * 60 * 60 * 1000        // 2 hours
    };

    return ttlMap[priority];
  }

  private async cacheData(key: string, data: any, priority: WarmingStrategy['priority']): Promise<void> {
    const entry: CacheEntry<any> = {
      data,
      timestamp: Date.now(),
      ttl: this.getTTLForPriority(priority),
      metadata: {
        source: 'warming',
        priority,
        warmingTime: Date.now()
      }
    };

    await this.storage.set(key, entry);
  }

  // Placeholder methods for data fetchers - these would be implemented based on your API
  private getCriticalDataFetchers(context: WarmingContext): Record<string, () => Promise<any>> {
    return {
      [`user:${context.userId}:profile`]: async () => ({ /* user profile data */ }),
      [`user:${context.userId}:preferences`]: async () => ({ /* user preferences */ }),
      [`user:${context.userId}:permissions`]: async () => ({ /* user permissions */ }),
      'navigation:menu': async () => ({ /* navigation menu */ }),
      'app:config': async () => ({ /* app configuration */ })
    };
  }

  private getRouteDataFetchers(context: WarmingContext): Record<string, () => Promise<any>> {
    return {
      '/dashboard': async () => ({ /* dashboard data */ }),
      '/students': async () => ({ /* students data */ }),
      '/teachers': async () => ({ /* teachers data */ }),
      '/analytics': async () => ({ /* analytics data */ })
    };
  }

  private getAnalyticsDataFetchers(context: WarmingContext): Record<string, () => Promise<any>> {
    return {};
  }

  private getPredictiveDataFetchers(context: WarmingContext): Record<string, (params: any) => Promise<any>> {
    return {};
  }

  private predictNextRoutes(context: WarmingContext): string[] {
    // Simple route prediction based on current route
    const routePredictions: Record<string, string[]> = {
      '/': ['/dashboard', '/students', '/teachers'],
      '/dashboard': ['/students', '/analytics', '/teachers'],
      '/students': ['/students/new', '/dashboard'],
      '/teachers': ['/teachers/new', '/dashboard'],
      '/analytics': ['/dashboard', '/students', '/teachers']
    };

    return routePredictions[context.currentRoute || '/'] || [];
  }

  private getFrequentDataKeys(analytics: WarmingContext['analytics']): string[] {
    if (!analytics) return [];

    return [
      ...analytics.mostVisitedPages.map(page => `route:${page}:data`),
      ...analytics.frequentlyUsedFeatures.map(feature => `feature:${feature}:data`)
    ];
  }

  private async generatePredictions(context: WarmingContext): Promise<Array<{
    key: string;
    type: string;
    confidence: number;
    params: any;
  }>> {
    // Simplified prediction logic
    return [
      {
        key: `prediction:${context.userId}:next-action`,
        type: 'user-action',
        confidence: 0.8,
        params: { userId: context.userId }
      }
    ];
  }
}

/**
 * React hook for cache warming
 */
export function useCacheWarming(
  storage: CacheStorage,
  config?: Partial<WarmingConfig>
) {
  const [manager] = React.useState(() => new CacheWarmingManager(storage, config));
  const [stats, setStats] = React.useState<Awaited<ReturnType<typeof manager.getStats>> | null>(null);

  const executeWarming = React.useCallback((
    trigger: Parameters<typeof manager.executeWarming>[0],
    context?: Parameters<typeof manager.executeWarming>[1]
  ) => {
    return manager.executeWarming(trigger, context);
  }, [manager]);

  const warmKeys = React.useCallback((
    keys: string[],
    fetchers: Record<string, () => Promise<any>>,
    priority?: WarmingStrategy['priority']
  ) => {
    return manager.warmKeys(keys, fetchers, priority);
  }, [manager]);

  React.useEffect(() => {
    manager.getStats().then(setStats);
  }, [manager]);

  return {
    manager,
    stats,
    executeWarming,
    warmKeys
  };
}

// Import React for hooks
import React from 'react';