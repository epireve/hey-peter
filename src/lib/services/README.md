# Modular Service Architecture

This document describes the new modular service architecture that has been implemented to improve maintainability, testability, and performance of the service layer.

## Overview

The service layer has been refactored from large monolithic services into smaller, focused modules with clear responsibilities. This architecture provides:

- **Better separation of concerns**: Each module handles a specific domain
- **Improved testability**: Smaller, focused modules are easier to test
- **Enhanced maintainability**: Easier to understand and modify individual modules
- **Better performance**: Optimized for specific use cases
- **Dependency injection**: Flexible service composition and testing
- **Comprehensive logging**: Better observability and debugging
- **Backward compatibility**: Existing code continues to work without changes

## Architecture Components

### 1. Service Interfaces (`interfaces/service-interfaces.ts`)

Defines the contracts that all services must implement:

```typescript
interface BaseService {
  readonly serviceName: string;
  readonly version: string;
  isHealthy(): Promise<boolean>;
  dispose?(): Promise<void>;
}
```

### 2. Dependency Injection System

```typescript
// Service container manages dependencies
const container = ServiceContainer.getInstance();

// Get dependencies
const deps = container.getDependencies();

// Register services
container.registerService('HourPurchaseService', hourPurchaseService);
```

### 3. Error Handling and Logging

```typescript
// Automatic error handling wrapper
const wrappedService = withErrorHandling(service);

// Caching wrapper
const cachedService = withCaching(service, cacheService);
```

## Hour Management Services

### Original Service
- `HourManagementService` (1022 lines) - Monolithic service handling all hour operations

### New Modular Services

#### 1. HourPurchaseService
**Responsibilities:**
- Package management and retrieval
- Hour purchases and payment processing
- Purchase history and tracking
- Corporate purchase handling

**Key Methods:**
```typescript
getHourPackages(options?: FilterOptions): Promise<HourApiResponse<HourPackage[]>>
purchaseHours(request: HourPurchaseRequest): Promise<HourApiResponse<HourPurchase>>
getCorporatePurchaseStats(corporateAccountId: string): Promise<HourApiResponse<CorporateStats>>
```

#### 2. HourTransactionService
**Responsibilities:**
- Hour deductions for classes
- Balance calculations and tracking
- Hour transfers between students
- Transaction history and auditing

**Key Methods:**
```typescript
deductClassHours(params: DeductionParams): Promise<HourApiResponse<HourTransaction>>
transferHours(request: HourTransferRequest): Promise<HourApiResponse<HourTransferLog>>
getStudentHourBalance(studentId: string): Promise<HourApiResponse<StudentHourBalance>>
```

#### 3. HourAdjustmentService
**Responsibilities:**
- Manual hour adjustments (add/subtract)
- Adjustment approval workflows
- Hour alerts and notifications
- Adjustment history and auditing

**Key Methods:**
```typescript
createHourAdjustment(request: HourAdjustmentRequest): Promise<HourApiResponse<HourAdjustment>>
approveAdjustment(adjustmentId: string, params: ApprovalParams): Promise<HourApiResponse<HourAdjustment>>
getActiveAlerts(options?: AlertOptions): Promise<HourApiResponse<HourAlert[]>>
```

#### 4. HourStatisticsService
**Responsibilities:**
- Usage statistics and patterns
- Monthly and yearly reports
- System-wide analytics
- Trending analysis and predictions

**Key Methods:**
```typescript
getHourUsageStats(studentId: string, periodDays?: number): Promise<HourApiResponse<HourUsageStats>>
generateMonthlyReport(studentId: string, year: number, month: number): Promise<HourApiResponse<MonthlyReport>>
getSystemWideStats(): Promise<HourApiResponse<SystemStats>>
```

#### 5. ModularHourManagementService
**Responsibilities:**
- Unified interface to all hour management operations
- Combines multiple service operations
- Provides convenience methods

**Key Methods:**
```typescript
completePurchaseFlow(request: HourPurchaseRequest): Promise<HourApiResponse<PurchaseFlowResult>>
completeClassDeduction(params: DeductionParams): Promise<HourApiResponse<DeductionResult>>
getStudentHourOverview(studentId: string): Promise<HourApiResponse<StudentOverview>>
```

## Performance Monitoring Services

### Original Service
- `enhanced-performance-monitor.ts` (1937 lines) - Monolithic performance monitoring

### New Modular Services

#### 1. WebVitalsService
**Responsibilities:**
- Core Web Vitals tracking (LCP, FID, CLS, TTFB, FCP, TTI)
- Web performance analysis
- Threshold monitoring

**Key Methods:**
```typescript
recordWebVital(type: WebVitalType, value: number, metadata?: Record<string, any>): Promise<void>
getWebVitals(timeRange: TimeRange): Promise<WebVitalsReport>
checkWebVitalThresholds(): Promise<ThresholdReport>
```

#### 2. PerformanceMetricsService
**Responsibilities:**
- Component render times
- API response times
- Database query performance
- Navigation timing
- User interaction response times

**Key Methods:**
```typescript
recordMetric(entry: PerformanceEntry): Promise<void>
getMetrics(filters: MetricFilters): Promise<PerformanceEntry[]>
getMetricsSummary(timeRange: TimeRange): Promise<MetricsSummary>
```

#### 3. PerformanceAlertService
**Responsibilities:**
- Performance threshold monitoring
- Alert generation and management
- Notification systems
- Alert acknowledgment and resolution

**Key Methods:**
```typescript
createAlert(params: AlertParams): Promise<void>
checkAlerts(): Promise<TriggeredAlert[]>
acknowledgeAlert(alertId: string): Promise<void>
```

#### 4. ResourceMonitoringService
**Responsibilities:**
- Memory usage tracking
- CPU usage monitoring
- Network request tracking
- Resource leak detection
- Performance bottleneck identification

**Key Methods:**
```typescript
recordResourceUsage(params: ResourceUsageParams): Promise<void>
getResourceTrends(timeRange: TimeRange): Promise<ResourceTrends>
detectResourceLeaks(): Promise<ResourceLeaks>
```

#### 5. PerformanceMonitoringService
**Responsibilities:**
- Unified interface to all performance monitoring operations
- Comprehensive performance reports
- Real-time performance dashboards

**Key Methods:**
```typescript
generatePerformanceReport(timeRange: TimeRange): Promise<PerformanceReport>
getPerformanceDashboard(): Promise<DashboardData>
identifyBottlenecks(): Promise<PerformanceBottleneck[]>
```

## Backward Compatibility

### Compatibility Layer

The compatibility layer ensures existing code continues to work without changes:

```typescript
// Original usage continues to work
import { hourManagementService } from '@/lib/services';

// Enhanced features available through compatibility layer
import { enhancedHourManagementService } from '@/lib/services';

// New modular services for advanced usage
import { modularHourManagementService } from '@/lib/services';
```

### Migration Strategy

1. **Phase 1: Dual Operation** (Current)
   - Both original and modular services available
   - Compatibility layer provides enhanced features
   - No breaking changes to existing code

2. **Phase 2: Gradual Migration** (Future)
   - Update components to use modular services
   - Deprecate original services
   - Provide migration utilities

3. **Phase 3: Full Migration** (Future)
   - Remove original services
   - Full modular architecture
   - Performance optimizations

## Usage Examples

### Basic Usage (Backward Compatible)

```typescript
import { hourManagementService } from '@/lib/services';

// Works exactly as before
const balance = await hourManagementService.getStudentHourBalance(studentId);
```

### Enhanced Usage (Compatibility Layer)

```typescript
import { enhancedHourManagementService } from '@/lib/services';

// Access to both original and enhanced features
const overview = await enhancedHourManagementService.getStudentHourOverview(studentId);
const status = await enhancedHourManagementService.getServiceStatus();
```

### Modular Usage (New Architecture)

```typescript
import { 
  hourPurchaseService, 
  hourTransactionService, 
  hourStatisticsService 
} from '@/lib/services';

// Use specific services directly
const packages = await hourPurchaseService.getHourPackages();
const balance = await hourTransactionService.getStudentHourBalance(studentId);
const stats = await hourStatisticsService.getHourUsageStats(studentId);
```

### Advanced Usage (Dependency Injection)

```typescript
import { ServiceContainer, HourPurchaseService } from '@/lib/services';

// Create service with custom dependencies
const container = ServiceContainer.getInstance();
const customService = new HourPurchaseService(container.getDependencies());

// Test with mock dependencies
const mockDeps = { supabase: mockSupabase, logger: mockLogger };
const testService = new HourPurchaseService(mockDeps);
```

## Performance Benefits

### Before (Monolithic)
- Large bundle sizes
- Harder to tree-shake unused code
- Complex testing scenarios
- Difficult to maintain

### After (Modular)
- Smaller, focused modules
- Better tree-shaking
- Easier unit testing
- Clearer separation of concerns
- Dependency injection for flexibility

## Testing Strategy

### Unit Tests
```typescript
describe('HourPurchaseService', () => {
  let service: HourPurchaseService;
  let mockDeps: ServiceDependencies;

  beforeEach(() => {
    mockDeps = {
      supabase: mockSupabase,
      logger: mockLogger
    };
    service = new HourPurchaseService(mockDeps);
  });

  it('should purchase hours successfully', async () => {
    const result = await service.purchaseHours(mockRequest);
    expect(result.success).toBe(true);
  });
});
```

### Integration Tests
```typescript
describe('ModularHourManagementService', () => {
  let service: ModularHourManagementService;

  beforeEach(() => {
    service = new ModularHourManagementService();
  });

  it('should complete purchase flow', async () => {
    const result = await service.completePurchaseFlow(mockRequest);
    expect(result.success).toBe(true);
    expect(result.data.purchase).toBeDefined();
    expect(result.data.newBalance).toBeDefined();
  });
});
```

## Monitoring and Observability

### Service Health Checks
```typescript
// Check individual service health
const isHealthy = await hourPurchaseService.isHealthy();

// Check all services
const status = await modularHourManagementService.getServiceStatus();
```

### Performance Monitoring
```typescript
// Monitor service performance
const report = await performanceMonitoringService.generatePerformanceReport(timeRange);

// Real-time dashboard
const dashboard = await performanceMonitoringService.getPerformanceDashboard();
```

### Error Handling
```typescript
// Automatic error handling with logging
const wrappedService = withErrorHandling(hourPurchaseService);

// Enhanced error responses
const result = await wrappedService.purchaseHours(request);
if (!result.success) {
  console.error('Purchase failed:', result.error);
}
```

## Best Practices

1. **Use interfaces**: Always program against interfaces, not implementations
2. **Dependency injection**: Use the service container for dependency management
3. **Error handling**: Always check service responses and handle errors appropriately
4. **Logging**: Use the integrated logging system for observability
5. **Testing**: Write unit tests for all service methods
6. **Performance**: Monitor service performance using the built-in monitoring tools
7. **Backward compatibility**: Use the compatibility layer when migrating existing code

## Future Enhancements

1. **Caching layer**: Implement distributed caching for better performance
2. **Circuit breaker**: Add circuit breaker pattern for resilience
3. **Rate limiting**: Implement rate limiting for API calls
4. **Metrics collection**: Enhanced metrics collection and reporting
5. **Service mesh**: Consider service mesh for microservices architecture
6. **Event-driven architecture**: Implement event-driven patterns for loose coupling

## Migration Guide

### For Existing Components

1. **No immediate changes required** - existing code continues to work
2. **Gradual migration** - replace service calls with modular equivalents
3. **Enhanced features** - use compatibility layer for new features
4. **Testing** - update tests to use dependency injection

### For New Components

1. **Use modular services** - import specific services you need
2. **Implement interfaces** - program against service interfaces
3. **Use dependency injection** - for better testability
4. **Add proper error handling** - check service responses
5. **Include monitoring** - use performance monitoring tools

This modular architecture provides a solid foundation for scalable, maintainable, and performant service layer while maintaining backward compatibility with existing code.