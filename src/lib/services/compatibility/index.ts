/**
 * Service Compatibility Layer
 * 
 * This module provides backward compatibility for existing code while
 * internally using the new modular service architecture.
 */

// Hour Management Compatibility
export { 
  enhancedHourManagementService,
  EnhancedHourManagementService,
  hourManagementService
} from './hour-management-compatibility';

// Performance Monitoring Compatibility
export { 
  enhancedPerformanceMonitor,
  EnhancedPerformanceMonitorCompatibility,
  performanceMonitoringService
} from './performance-monitoring-compatibility';

// Re-export original services for complete backward compatibility
export { hourManagementService as originalHourManagementService } from '../hour-management-service';

// Migration utilities
export const MigrationUtils = {
  /**
   * Check if modular services are available
   */
  isModularAvailable(): boolean {
    try {
      // Try to import modular services
      require('../modules/hour-management-service-modular');
      require('../modules/performance/performance-monitoring-service');
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Get migration recommendations
   */
  getMigrationRecommendations(): Array<{
    service: string;
    recommendation: string;
    priority: 'low' | 'medium' | 'high';
    benefits: string[];
    breakingChanges: string[];
  }> {
    return [
      {
        service: 'HourManagementService',
        recommendation: 'Migrate to ModularHourManagementService for better performance and maintainability',
        priority: 'medium',
        benefits: [
          'Better separation of concerns',
          'Improved testability',
          'Enhanced error handling',
          'More detailed logging',
          'Better performance metrics'
        ],
        breakingChanges: [
          'Some method signatures may have changed',
          'Error response format may be different',
          'Some metadata fields may be renamed'
        ]
      },
      {
        service: 'EnhancedPerformanceMonitor',
        recommendation: 'Migrate to PerformanceMonitoringService for comprehensive monitoring',
        priority: 'high',
        benefits: [
          'Modular architecture',
          'Better Web Vitals tracking',
          'Advanced alerting system',
          'Resource monitoring',
          'Performance bottleneck detection'
        ],
        breakingChanges: [
          'API method names may differ',
          'Data structure changes',
          'Configuration format updates'
        ]
      }
    ];
  },

  /**
   * Validate service compatibility
   */
  async validateCompatibility(): Promise<{
    hourManagement: { original: boolean; modular: boolean; compatible: boolean };
    performance: { original: boolean; modular: boolean; compatible: boolean };
    overall: boolean;
  }> {
    const results = {
      hourManagement: { original: false, modular: false, compatible: false },
      performance: { original: false, modular: false, compatible: false },
      overall: false
    };

    try {
      // Test hour management services
      const { enhancedHourManagementService } = await import('./hour-management-compatibility');
      const status = await enhancedHourManagementService.getServiceStatus();
      results.hourManagement.original = status.original;
      results.hourManagement.modular = status.modular.overall;
      results.hourManagement.compatible = status.overall;
    } catch (error) {
      console.error('Hour management compatibility check failed:', error);
    }

    try {
      // Test performance monitoring services
      const { enhancedPerformanceMonitor } = await import('./performance-monitoring-compatibility');
      const status = await enhancedPerformanceMonitor.getServiceStatus();
      results.performance.original = true; // Compatibility layer exists
      results.performance.modular = status.overall;
      results.performance.compatible = status.overall;
    } catch (error) {
      console.error('Performance monitoring compatibility check failed:', error);
    }

    results.overall = results.hourManagement.compatible && results.performance.compatible;

    return results;
  }
};

// Version information
export const CompatibilityInfo = {
  version: '2.0.0',
  compatibilityMode: 'hybrid',
  services: {
    hourManagement: {
      original: '1.0.0',
      modular: '1.0.0',
      compatibility: '2.0.0'
    },
    performance: {
      original: '1.0.0',
      modular: '1.0.0',
      compatibility: '2.0.0'
    }
  },
  features: {
    backwardCompatibility: true,
    enhancedFeatures: true,
    modularArchitecture: true,
    dependencyInjection: true,
    improvedErrorHandling: true,
    comprehensiveLogging: true
  }
};