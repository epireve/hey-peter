/**
 * Refactored Services with Dependency Injection
 * 
 * This file exports the refactored services that use the new ServiceBase pattern
 * with proper dependency injection and factory patterns for better testability.
 */

// Import base service infrastructure
import {
  ServiceBase,
  BaseServiceFactory,
  ServiceContainer,
  serviceContainer as globalServiceContainer,
  createService,
  withServiceMethod,
  type ServiceDependencies,
  type ServiceConfig,
  type ServiceFactory
} from './base';

// Export base service infrastructure
export {
  ServiceBase,
  BaseServiceFactory,
  ServiceContainer,
  createService,
  withServiceMethod,
  type ServiceDependencies,
  type ServiceConfig,
  type ServiceFactory
};

export { globalServiceContainer as serviceContainer };

// Import refactored services
import {
  HourManagementService,
  HourManagementServiceFactory,
  createHourManagementService,
  hourManagementService as refactoredHourManagementService
} from './hour-management-service-simple';

// Export refactored services
export {
  HourManagementService,
  HourManagementServiceFactory,
  createHourManagementService,
  refactoredHourManagementService
};

// For now, we'll create simplified versions without decorators
// export {
//   StudentService,
//   StudentServiceFactory,
//   createStudentService,
//   studentService as refactoredStudentService,
//   type Student,
//   type CreateStudentData,
//   studentSchema,
//   createStudentSchema
// } from './student-service-refactored';

// export {
//   CourseService,
//   CourseServiceFactory,
//   createCourseService,
//   courseService as refactoredCourseService,
//   type Course,
//   type CourseWithStats,
//   courseSchema
// } from './course-service-refactored';

/**
 * Service Registration Helper
 * 
 * This function registers all refactored services with the global container
 */
export function registerRefactoredServices(container: ServiceContainer = globalServiceContainer): void {
  container.registerFactory('HourManagementService', new HourManagementServiceFactory());
  // TODO: Add other service factories when decorator issues are resolved
  // container.registerFactory('StudentService', new StudentServiceFactory());
  // container.registerFactory('CourseService', new CourseServiceFactory());
}

/**
 * Migration Helper for Existing Code
 * 
 * Provides a backward-compatible way to access services while migrating
 */
export class ServiceMigrationHelper {
  private container: ServiceContainer;

  constructor(container?: ServiceContainer) {
    this.container = container || globalServiceContainer;
    registerRefactoredServices(this.container);
  }

  /**
   * Get a service instance with dependency injection support
   */
  getService<T>(serviceName: string, dependencies?: ServiceDependencies): T {
    return this.container.getService<T>(serviceName, dependencies);
  }

  /**
   * Create a service with custom dependencies for testing
   */
  createTestService<T>(serviceName: string, mockDependencies: ServiceDependencies): T {
    return this.container.getService<T>(serviceName, mockDependencies);
  }

  /**
   * Clear all cached services (useful for testing)
   */
  clearServices(): void {
    this.container.clear();
  }
}

/**
 * Default migration helper instance
 */
export const serviceMigrationHelper = new ServiceMigrationHelper();

/**
 * Convenience functions for common service access patterns
 */
export function getHourManagementService(dependencies?: ServiceDependencies): HourManagementService {
  return serviceMigrationHelper.getService<HourManagementService>('HourManagementService', dependencies);
}

// export function getStudentService(dependencies?: ServiceDependencies): StudentService {
//   return serviceMigrationHelper.getService<StudentService>('StudentService', dependencies);
// }

// export function getCourseService(dependencies?: ServiceDependencies): CourseService {
//   return serviceMigrationHelper.getService<CourseService>('CourseService', dependencies);
// }

/**
 * Testing utilities
 */
export const TestingUtils = {
  /**
   * Create services with mock dependencies for testing
   */
  createMockServices(mockSupabaseClient: any, mockLogger?: any) {
    const mockDependencies: ServiceDependencies = {
      supabaseClient: mockSupabaseClient,
      logger: mockLogger
    };

    return {
      hourManagementService: createHourManagementService(mockDependencies)
      // TODO: Add other services when decorator issues are resolved
      // studentService: createStudentService(mockDependencies),
      // courseService: createCourseService(mockDependencies)
    };
  },

  /**
   * Clear all service caches
   */
  clearServiceCaches() {
    serviceMigrationHelper.clearServices();
  }
};