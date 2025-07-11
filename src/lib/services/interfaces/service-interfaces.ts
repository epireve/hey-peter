/**
 * Service Interfaces and Dependencies
 * 
 * This file defines the core interfaces and dependency injection system
 * for the modular service architecture.
 */

import { createClient } from '@/lib/supabase';
import { logger } from '@/lib/services/logger';
import type {
  HourPackage,
  HourPurchase,
  HourTransaction,
  HourAdjustment,
  HourAlert,
  HourTransferLog,
  StudentHourBalance,
  HourUsageStats,
  HourPurchaseRequest,
  HourTransferRequest,
  HourAdjustmentRequest,
  HourApiResponse,
  HourPaginatedResponse,
  PaymentStatus,
  HourTransactionType
} from '@/types/hours';

// =====================================================================================
// BASE SERVICE INTERFACE
// =====================================================================================

export interface BaseService {
  readonly serviceName: string;
  readonly version: string;
  isHealthy(): Promise<boolean>;
  dispose?(): Promise<void>;
}

// =====================================================================================
// DEPENDENCY INJECTION CONTAINER
// =====================================================================================

export interface ServiceDependencies {
  supabase: ReturnType<typeof createClient>;
  logger: typeof logger;
}

export class ServiceContainer {
  private static instance: ServiceContainer;
  private dependencies: ServiceDependencies;
  private services: Map<string, BaseService> = new Map();

  private constructor() {
    this.dependencies = {
      supabase: createClient(),
      logger: logger
    };
  }

  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  getDependencies(): ServiceDependencies {
    return this.dependencies;
  }

  registerService<T extends BaseService>(name: string, service: T): void {
    this.services.set(name, service);
  }

  getService<T extends BaseService>(name: string): T | undefined {
    return this.services.get(name) as T;
  }

  async disposeAll(): Promise<void> {
    const disposePromises: Promise<void>[] = [];
    
    for (const service of this.services.values()) {
      if (service.dispose) {
        disposePromises.push(service.dispose());
      }
    }
    
    await Promise.all(disposePromises);
    this.services.clear();
  }
}

// =====================================================================================
// HOUR MANAGEMENT SERVICE INTERFACES
// =====================================================================================

export interface IHourPurchaseService extends BaseService {
  getHourPackages(options?: {
    isActive?: boolean;
    isFeatured?: boolean;
    isCorporate?: boolean;
  }): Promise<HourApiResponse<HourPackage[]>>;
  
  getHourPackage(packageId: string): Promise<HourApiResponse<HourPackage>>;
  
  purchaseHours(request: HourPurchaseRequest): Promise<HourApiResponse<HourPurchase>>;
  
  getRecentPurchases(options?: { limit?: number }): Promise<HourApiResponse<HourPurchase[]>>;
  
  processPayment(purchaseId: string, request: HourPurchaseRequest): Promise<{
    success: boolean;
    reference?: string;
    error?: string;
  }>;
}

export interface IHourTransactionService extends BaseService {
  deductClassHours(params: {
    studentId: string;
    classId: string;
    bookingId: string;
    hours: number;
    classType: string;
    deductionRate?: number;
  }): Promise<HourApiResponse<HourTransaction>>;
  
  transferHours(request: HourTransferRequest): Promise<HourApiResponse<HourTransferLog>>;
  
  getStudentHourBalance(studentId: string): Promise<HourApiResponse<StudentHourBalance>>;
  
  getStudentTotalHours(studentId: string): Promise<number>;
  
  createTransaction(params: {
    studentId: string;
    purchaseId?: string;
    transactionType: HourTransactionType;
    hoursAmount: number;
    description: string;
    balanceBefore: number;
    balanceAfter: number;
    classId?: string;
    bookingId?: string;
  }): Promise<void>;
}

export interface IHourAdjustmentService extends BaseService {
  createHourAdjustment(request: HourAdjustmentRequest): Promise<HourApiResponse<HourAdjustment>>;
  
  getPendingAdjustments(): Promise<HourApiResponse<HourAdjustment[]>>;
  
  approveAdjustment(adjustmentId: string, params: { 
    approvalNotes?: string 
  }): Promise<HourApiResponse<HourAdjustment>>;
  
  rejectAdjustment(adjustmentId: string, params: { 
    approvalNotes: string 
  }): Promise<HourApiResponse<HourAdjustment>>;
  
  getActiveAlerts(): Promise<HourApiResponse<HourAlert[]>>;
}

export interface IHourStatisticsService extends BaseService {
  getHourUsageStats(studentId: string, periodDays?: number): Promise<HourApiResponse<HourUsageStats>>;
  
  calculateUsageStats(transactions: any[], periodStart: Date): HourUsageStats;
  
  generateMonthlyReport(studentId: string, year: number, month: number): Promise<HourApiResponse<{
    totalHoursUsed: number;
    totalHoursPurchased: number;
    totalHoursExpired: number;
    usageByClassType: Record<string, number>;
    dailyUsage: Array<{ date: string; hours: number }>;
    weeklyTrends: Array<{ week: string; hours: number }>;
  }>>;
  
  getSystemWideStats(): Promise<HourApiResponse<{
    totalActiveStudents: number;
    totalHoursInSystem: number;
    totalHoursUsedThisMonth: number;
    averageHoursPerStudent: number;
    topClassTypes: Array<{ type: string; hours: number }>;
    monthlyGrowth: number;
  }>>;
}

// =====================================================================================
// PERFORMANCE MONITORING INTERFACES
// =====================================================================================

export type MetricType = 
  | 'render' 
  | 'api' 
  | 'query' 
  | 'web_vital' 
  | 'user_journey' 
  | 'navigation' 
  | 'interaction' 
  | 'bundle_load' 
  | 'error';

export type WebVitalType = 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'FCP' | 'TTI';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface PerformanceEntry {
  name: string;
  type: MetricType;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
  errorDetails?: {
    message: string;
    stack?: string;
    componentStack?: string;
  };
}

export interface IPerformanceMetricsService extends BaseService {
  recordMetric(entry: PerformanceEntry): Promise<void>;
  
  getMetrics(filters: {
    type?: MetricType;
    timeRange?: { start: Date; end: Date };
    userId?: string;
    sessionId?: string;
  }): Promise<PerformanceEntry[]>;
  
  getMetricsSummary(timeRange: { start: Date; end: Date }): Promise<{
    averageResponseTime: number;
    totalRequests: number;
    errorRate: number;
    slowestRequests: PerformanceEntry[];
    topErrors: Array<{ message: string; count: number }>;
  }>;
}

export interface IWebVitalsService extends BaseService {
  recordWebVital(type: WebVitalType, value: number, metadata?: Record<string, any>): Promise<void>;
  
  getWebVitals(timeRange: { start: Date; end: Date }): Promise<{
    LCP: { average: number; p75: number; p95: number };
    FID: { average: number; p75: number; p95: number };
    CLS: { average: number; p75: number; p95: number };
    TTFB: { average: number; p75: number; p95: number };
    FCP: { average: number; p75: number; p95: number };
    TTI: { average: number; p75: number; p95: number };
  }>;
  
  checkWebVitalThresholds(): Promise<{
    healthy: boolean;
    alerts: Array<{ metric: WebVitalType; value: number; threshold: number }>;
  }>;
}

export interface IPerformanceAlertService extends BaseService {
  createAlert(params: {
    type: MetricType;
    threshold: number;
    severity: AlertSeverity;
    message: string;
    conditions?: Record<string, any>;
  }): Promise<void>;
  
  checkAlerts(): Promise<Array<{
    id: string;
    type: MetricType;
    severity: AlertSeverity;
    message: string;
    triggeredAt: Date;
    value: number;
    threshold: number;
  }>>;
  
  acknowledgeAlert(alertId: string): Promise<void>;
  
  getActiveAlerts(): Promise<Array<{
    id: string;
    type: MetricType;
    severity: AlertSeverity;
    message: string;
    triggeredAt: Date;
    acknowledged: boolean;
  }>>;
}

export interface IResourceMonitoringService extends BaseService {
  recordResourceUsage(params: {
    memoryUsage: number;
    cpuUsage: number;
    networkRequests: number;
    timestamp: Date;
  }): Promise<void>;
  
  getResourceTrends(timeRange: { start: Date; end: Date }): Promise<{
    memory: Array<{ timestamp: Date; usage: number }>;
    cpu: Array<{ timestamp: Date; usage: number }>;
    network: Array<{ timestamp: Date; requests: number }>;
  }>;
  
  detectResourceLeaks(): Promise<{
    memoryLeaks: Array<{ component: string; growth: number }>;
    cpuHogs: Array<{ component: string; usage: number }>;
  }>;
}

// =====================================================================================
// ERROR HANDLING INTERFACES
// =====================================================================================

export interface ServiceError {
  code: string;
  message: string;
  details?: any;
  timestamp?: Date;
  service?: string;
}

export interface IErrorHandlingService extends BaseService {
  handleError(error: ServiceError): Promise<void>;
  
  createErrorResponse<T>(error: ServiceError): HourApiResponse<T>;
  
  wrapServiceCall<T>(
    serviceName: string,
    operationName: string,
    operation: () => Promise<T>
  ): Promise<HourApiResponse<T>>;
}

// =====================================================================================
// CACHING INTERFACES
// =====================================================================================

export interface ICacheService extends BaseService {
  get<T>(key: string): Promise<T | null>;
  
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  
  delete(key: string): Promise<void>;
  
  clear(): Promise<void>;
  
  keys(pattern?: string): Promise<string[]>;
}

// =====================================================================================
// AUDIT LOGGING INTERFACES
// =====================================================================================

export interface IAuditLogService extends BaseService {
  logOperation(params: {
    operation: string;
    entityType: string;
    entityId: string;
    userId?: string;
    changes?: Record<string, any>;
    metadata?: Record<string, any>;
  }): Promise<void>;
  
  getAuditLog(entityType: string, entityId: string): Promise<Array<{
    id: string;
    operation: string;
    userId: string;
    changes: Record<string, any>;
    timestamp: Date;
    metadata: Record<string, any>;
  }>>;
}

// =====================================================================================
// SERVICE FACTORY
// =====================================================================================

export class ServiceFactory {
  private static container = ServiceContainer.getInstance();
  
  static createHourPurchaseService(): IHourPurchaseService {
    throw new Error('HourPurchaseService implementation not registered');
  }
  
  static createHourTransactionService(): IHourTransactionService {
    throw new Error('HourTransactionService implementation not registered');
  }
  
  static createHourAdjustmentService(): IHourAdjustmentService {
    throw new Error('HourAdjustmentService implementation not registered');
  }
  
  static createHourStatisticsService(): IHourStatisticsService {
    throw new Error('HourStatisticsService implementation not registered');
  }
  
  static getContainer(): ServiceContainer {
    return this.container;
  }
}

// =====================================================================================
// UTILITY FUNCTIONS
// =====================================================================================

export function withErrorHandling<T extends BaseService>(service: T): T {
  return new Proxy(service, {
    get(target, prop) {
      const value = target[prop as keyof T];
      
      if (typeof value === 'function') {
        return async function(...args: any[]) {
          try {
            return await value.apply(target, args);
          } catch (error) {
            logger.error(`Error in ${service.serviceName}.${String(prop)}:`, error);
            throw error;
          }
        };
      }
      
      return value;
    }
  });
}

export function withCaching<T extends BaseService>(service: T, cache: ICacheService): T {
  return new Proxy(service, {
    get(target, prop) {
      const value = target[prop as keyof T];
      
      if (typeof value === 'function' && String(prop).startsWith('get')) {
        return async function(...args: any[]) {
          const cacheKey = `${service.serviceName}:${String(prop)}:${JSON.stringify(args)}`;
          
          // Try to get from cache first
          const cached = await cache.get(cacheKey);
          if (cached) {
            return cached;
          }
          
          // Call the original method
          const result = await value.apply(target, args);
          
          // Cache the result (5 minutes TTL)
          await cache.set(cacheKey, result, 300);
          
          return result;
        };
      }
      
      return value;
    }
  });
}