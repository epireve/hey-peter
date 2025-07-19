/**
 * Tests for refactored services to ensure they work with dependency injection
 */

import {
  TestingUtils,
  getHourManagementService,
  ServiceMigrationHelper
} from '../../refactored-services';

import { HourManagementService } from '../../hour-management-service-simple';

// Mock Supabase client for testing
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({ 
          data: { id: '1', name: 'test', package_type: 'basic' }, 
          error: null 
        })
      })),
      order: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: [], error: null })
        }))
      }))
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({ 
          data: { id: '1', name: 'test' }, 
          error: null 
        })
      }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ 
            data: { id: '1', name: 'updated' }, 
            error: null 
          })
        }))
      }))
    }))
  })),
  auth: {
    getUser: jest.fn().mockResolvedValue({ 
      data: { user: { id: 'user-1' } }, 
      error: null 
    })
  },
  rpc: jest.fn().mockResolvedValue({ data: 10, error: null })
};

// Mock logger for testing
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

describe('Refactored Services Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    TestingUtils.clearServiceCaches();
  });

  describe('HourManagementService with DI', () => {
    test('should create service with injected dependencies', () => {
      const services = TestingUtils.createMockServices(mockSupabaseClient, mockLogger);
      
      expect(services.hourManagementService).toBeInstanceOf(HourManagementService);
      expect(services.hourManagementService.getName()).toBe('HourManagementService');
    });

    test('should use injected Supabase client', async () => {
      const services = TestingUtils.createMockServices(mockSupabaseClient, mockLogger);
      
      await services.hourManagementService.getHourPackages();
      
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('hour_packages');
    });

    test('should handle service methods with error handling', async () => {
      const errorSupabaseClient = {
        ...mockSupabaseClient,
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            order: jest.fn(() => {
              throw new Error('Database error');
            })
          }))
        }))
      };

      const services = TestingUtils.createMockServices(errorSupabaseClient, mockLogger);
      
      const result = await services.hourManagementService.getHourPackages();
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('FETCH_PACKAGES_ERROR');
    });
  });

  // TODO: Add StudentService and CourseService tests when decorator issues are resolved

  describe('Service Migration Helper', () => {
    test('should provide backward-compatible access to services', () => {
      const migrationHelper = new ServiceMigrationHelper();
      
      const hourService = migrationHelper.getService<HourManagementService>('HourManagementService');
      
      expect(hourService).toBeInstanceOf(HourManagementService);
    });

    test('should create test services with mock dependencies', () => {
      const migrationHelper = new ServiceMigrationHelper();
      
      const mockDependencies = {
        supabaseClient: mockSupabaseClient,
        logger: mockLogger
      };

      const hourService = migrationHelper.createTestService<HourManagementService>(
        'HourManagementService', 
        mockDependencies
      );
      
      expect(hourService).toBeInstanceOf(HourManagementService);
    });

    test('should clear service caches', () => {
      const migrationHelper = new ServiceMigrationHelper();
      
      const service1 = migrationHelper.getService<HourManagementService>('HourManagementService');
      migrationHelper.clearServices();
      const service2 = migrationHelper.getService<HourManagementService>('HourManagementService');
      
      expect(service1).not.toBe(service2);
    });
  });

  describe('Convenience Functions', () => {
    test('should provide easy access to hour management service', () => {
      const hourService = getHourManagementService();
      
      expect(hourService).toBeInstanceOf(HourManagementService);
    });

    test('should allow custom dependencies via convenience functions', () => {
      const customDependencies = {
        supabaseClient: mockSupabaseClient,
        logger: mockLogger
      };

      const hourService = getHourManagementService(customDependencies);
      
      expect(hourService).toBeInstanceOf(HourManagementService);
    });
  });

  describe('Backward Compatibility', () => {
    test('should maintain API compatibility with existing services', async () => {
      const services = TestingUtils.createMockServices(mockSupabaseClient, mockLogger);
      
      // Test that existing method signatures still work
      const hourPackages = await services.hourManagementService.getHourPackages();
      
      expect(hourPackages).toHaveProperty('success');
    });

    test('should support existing error handling patterns', async () => {
      const errorSupabaseClient = {
        ...mockSupabaseClient,
        from: jest.fn(() => {
          throw new Error('Connection error');
        })
      };

      const services = TestingUtils.createMockServices(errorSupabaseClient, mockLogger);
      
      const result = await services.hourManagementService.getHourPackages();
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});