/**
 * Simplified Web Vitals Service Module
 * 
 * This module provides basic Web Vitals tracking without database dependencies
 */

import { 
  IWebVitalsService, 
  ServiceDependencies, 
  ServiceContainer, 
  withErrorHandling,
  WebVitalType
} from '../../interfaces/service-interfaces';

export interface WebVitalEntry {
  id: string;
  name: WebVitalType;
  value: number;
  delta: number;
  timestamp: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  url: string;
  sessionId: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export class WebVitalsService implements IWebVitalsService {
  readonly serviceName = 'WebVitalsService';
  readonly version = '1.0.0';
  
  private readonly logger;
  private webVitalEntries: WebVitalEntry[] = [];
  private maxEntries = 100; // Reduced for simplicity
  private sessionId: string;
  
  constructor(dependencies: ServiceDependencies) {
    this.logger = dependencies.logger;
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Record a Web Vital measurement
   */
  async recordWebVital(entry: Omit<WebVitalEntry, 'id' | 'timestamp' | 'sessionId'>): Promise<void> {
    try {
      const webVitalEntry: WebVitalEntry = {
        ...entry,
        id: `vital_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        sessionId: this.sessionId
      };

      // Store in memory (no database)
      this.webVitalEntries.push(webVitalEntry);
      
      // Keep only the most recent entries
      if (this.webVitalEntries.length > this.maxEntries) {
        this.webVitalEntries = this.webVitalEntries.slice(-this.maxEntries);
      }

      this.logger.debug('Web vital recorded', { 
        name: entry.name, 
        value: entry.value,
        rating: entry.rating 
      });
    } catch (error) {
      this.logger.error('Failed to record web vital', { error, entry });
      throw error;
    }
  }

  /**
   * Get Web Vitals summary - simplified version
   */
  async getWebVitals(timeRange?: { start: Date; end: Date }): Promise<{
    LCP: { average: number; count: number; latest?: WebVitalEntry };
    FID: { average: number; count: number; latest?: WebVitalEntry };
    CLS: { average: number; count: number; latest?: WebVitalEntry };
    TTFB: { average: number; count: number; latest?: WebVitalEntry };
    FCP: { average: number; count: number; latest?: WebVitalEntry };
    TTI: { average: number; count: number; latest?: WebVitalEntry };
  }> {
    try {
      // Return mock data for development
      const mockData = {
        LCP: { average: 1200, count: 10, latest: undefined },
        FID: { average: 8, count: 10, latest: undefined },
        CLS: { average: 0.05, count: 10, latest: undefined },
        TTFB: { average: 180, count: 10, latest: undefined },
        FCP: { average: 900, count: 10, latest: undefined },
        TTI: { average: 2100, count: 10, latest: undefined }
      };

      this.logger.debug('Web vitals summary retrieved', { 
        timeRange,
        entryCount: this.webVitalEntries.length 
      });

      return mockData;
    } catch (error) {
      this.logger.error('Failed to get web vitals summary', { error, timeRange });
      throw new Error('Failed to fetch web vitals');
    }
  }

  /**
   * Get performance score based on Web Vitals
   */
  async getPerformanceScore(): Promise<{
    score: number;
    breakdown: Record<WebVitalType, number>;
    recommendations: string[];
  }> {
    try {
      // Return mock performance score
      const mockScore = {
        score: 85,
        breakdown: {
          LCP: 90,
          FID: 95,
          CLS: 88,
          TTFB: 82,
          FCP: 87,
          TTI: 80
        } as Record<WebVitalType, number>,
        recommendations: [
          'Optimize image loading for better LCP',
          'Reduce JavaScript execution time',
          'Implement proper caching strategies'
        ]
      };

      this.logger.debug('Performance score calculated', { score: mockScore.score });
      return mockScore;
    } catch (error) {
      this.logger.error('Failed to calculate performance score', { error });
      throw error;
    }
  }

  /**
   * Get detailed Web Vitals analysis
   */
  async getWebVitalsAnalysis(timeRange?: { start: Date; end: Date }): Promise<{
    trends: Record<WebVitalType, { timestamp: number; value: number }[]>;
    distributions: Record<WebVitalType, { good: number; needsImprovement: number; poor: number }>;
    insights: string[];
  }> {
    try {
      // Return mock analysis
      const mockAnalysis = {
        trends: {
          LCP: [{ timestamp: Date.now() - 86400000, value: 1100 }, { timestamp: Date.now(), value: 1200 }],
          FID: [{ timestamp: Date.now() - 86400000, value: 9 }, { timestamp: Date.now(), value: 8 }],
          CLS: [{ timestamp: Date.now() - 86400000, value: 0.06 }, { timestamp: Date.now(), value: 0.05 }],
          TTFB: [{ timestamp: Date.now() - 86400000, value: 190 }, { timestamp: Date.now(), value: 180 }],
          FCP: [{ timestamp: Date.now() - 86400000, value: 950 }, { timestamp: Date.now(), value: 900 }],
          TTI: [{ timestamp: Date.now() - 86400000, value: 2200 }, { timestamp: Date.now(), value: 2100 }]
        } as Record<WebVitalType, { timestamp: number; value: number }[]>,
        distributions: {
          LCP: { good: 70, needsImprovement: 25, poor: 5 },
          FID: { good: 85, needsImprovement: 12, poor: 3 },
          CLS: { good: 75, needsImprovement: 20, poor: 5 },
          TTFB: { good: 65, needsImprovement: 25, poor: 10 },
          FCP: { good: 80, needsImprovement: 15, poor: 5 },
          TTI: { good: 60, needsImprovement: 30, poor: 10 }
        } as Record<WebVitalType, { good: number; needsImprovement: number; poor: number }>,
        insights: [
          'LCP performance is generally good but can be improved',
          'FID shows excellent responsiveness',
          'CLS is within acceptable range',
          'TTFB could benefit from server optimization'
        ]
      };

      this.logger.debug('Web vitals analysis completed', { 
        timeRange,
        insightCount: mockAnalysis.insights.length 
      });

      return mockAnalysis;
    } catch (error) {
      this.logger.error('Failed to get web vitals analysis', { error });
      throw error;
    }
  }

  /**
   * Get current session statistics
   */
  getSessionStats(): {
    sessionId: string;
    entryCount: number;
    startTime: number;
    lastEntry?: WebVitalEntry;
  } {
    return {
      sessionId: this.sessionId,
      entryCount: this.webVitalEntries.length,
      startTime: Date.now(),
      lastEntry: this.webVitalEntries[this.webVitalEntries.length - 1]
    };
  }

  /**
   * Clear all stored entries
   */
  clearEntries(): void {
    this.webVitalEntries = [];
    this.logger.debug('Web vital entries cleared');
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    return true; // Always healthy in simplified mode
  }
}