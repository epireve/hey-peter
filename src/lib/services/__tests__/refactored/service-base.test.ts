/**
 * Tests for ServiceBase and dependency injection infrastructure
 */

import { ServiceBase, ServiceContainer, createService, type ServiceDependencies } from '../../base';

// Mock Supabase client for testing
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({ data: { id: '1', name: 'test' }, error: null })
      }))
    }))
  })),
  auth: {
    getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  }
};

// Mock logger for testing
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Test service implementation
class TestService extends ServiceBase {
  constructor(dependencies?: ServiceDependencies) {
    super({
      name: 'TestService',
      dependencies,
      options: { testOption: true }
    });
  }

  async testMethod(): Promise<string> {
    return this.executeOperation('testMethod', async () => {
      return 'test-result';
    });
  }

  async errorMethod(): Promise<never> {
    return this.executeOperation('errorMethod', async () => {
      throw new Error('Test error');
    });
  }

  public getDependency<T>(key: string): T | undefined {
    return super.getDependency<T>(key);
  }

  public validateDeps(required: string[]): void {
    this.validateDependencies(required);
  }
}

describe('ServiceBase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor and initialization', () => {
    test('should initialize with default dependencies', () => {
      const service = new TestService();
      
      expect(service.getName()).toBe('TestService');
      // The service uses default logger, so we won't see calls to mockLogger
    });

    test('should initialize with injected dependencies', () => {
      const dependencies: ServiceDependencies = {
        supabaseClient: mockSupabaseClient,
        logger: mockLogger
      };

      const service = new TestService(dependencies);
      
      expect(service.getName()).toBe('TestService');
      expect(service.getDependency('supabaseClient')).toBe(mockSupabaseClient);
      expect(service.getDependency('logger')).toBe(mockLogger);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Initializing service: TestService',
        expect.objectContaining({
          dependencies: expect.any(Array),
          config: expect.any(Array)
        })
      );
    });
  });

  describe('dependency validation', () => {
    test('should validate required dependencies successfully', () => {
      const dependencies: ServiceDependencies = {
        supabaseClient: mockSupabaseClient,
        logger: mockLogger
      };

      const service = new TestService(dependencies);
      
      expect(() => {
        service.validateDeps(['supabaseClient', 'logger']);
      }).not.toThrow();
    });

    test('should throw error for missing required dependencies', () => {
      const service = new TestService();
      
      expect(() => {
        service.validateDeps(['supabaseClient', 'requiredDep']);
      }).toThrow('Missing required dependencies for TestService: supabaseClient, requiredDep');
    });
  });

  describe('operation execution', () => {
    test('should execute operations successfully', async () => {
      const dependencies: ServiceDependencies = {
        logger: mockLogger
      };
      const service = new TestService(dependencies);
      
      const result = await service.testMethod();
      
      expect(result).toBe('test-result');
      expect(mockLogger.debug).toHaveBeenCalledWith('TestService.testMethod', undefined);
    });

    test('should handle errors in operations', async () => {
      const dependencies: ServiceDependencies = {
        logger: mockLogger
      };
      const service = new TestService(dependencies);
      
      await expect(service.errorMethod()).rejects.toThrow('Test error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error in TestService.errorMethod:',
        expect.any(Error)
      );
    });
  });
});

describe('ServiceContainer', () => {
  let container: ServiceContainer;

  beforeEach(() => {
    container = new ServiceContainer();
  });

  test('should register and retrieve service factories', () => {
    const factory = {
      create: jest.fn().mockReturnValue(new TestService())
    };

    container.registerFactory('TestService', factory);
    
    const service = container.getService('TestService');
    
    expect(factory.create).toHaveBeenCalled();
    expect(service).toBeInstanceOf(TestService);
  });

  test('should reuse service instances', () => {
    const factory = {
      create: jest.fn().mockReturnValue(new TestService())
    };

    container.registerFactory('TestService', factory);
    
    const service1 = container.getService('TestService');
    const service2 = container.getService('TestService');
    
    expect(factory.create).toHaveBeenCalledTimes(1);
    expect(service1).toBe(service2);
  });

  test('should throw error for unregistered service', () => {
    expect(() => {
      container.getService('UnknownService');
    }).toThrow('No factory registered for service: UnknownService');
  });

  test('should clear cached services', () => {
    const factory = {
      create: jest.fn().mockReturnValue(new TestService())
    };

    container.registerFactory('TestService', factory);
    
    const service1 = container.getService('TestService');
    container.clear();
    const service2 = container.getService('TestService');
    
    expect(factory.create).toHaveBeenCalledTimes(2);
    // Note: Since the service container caches by type, not instance, 
    // clearing should result in new instances from factory
    expect(service1).toBeInstanceOf(TestService);
    expect(service2).toBeInstanceOf(TestService);
  });

  test('should list registered services', () => {
    const factory = {
      create: jest.fn().mockReturnValue(new TestService())
    };

    container.registerFactory('TestService', factory);
    container.registerFactory('AnotherService', factory);
    
    const registered = container.getRegisteredServices();
    
    expect(registered).toEqual(['TestService', 'AnotherService']);
  });
});

describe('createService helper', () => {
  test('should create service with dependencies', () => {
    const dependencies: ServiceDependencies = {
      supabaseClient: mockSupabaseClient,
      logger: mockLogger
    };

    const service = createService(TestService, 'TestService', dependencies);
    
    expect(service).toBeInstanceOf(TestService);
    expect(service.getName()).toBe('TestService');
    // Test that the service was created successfully
  });
});