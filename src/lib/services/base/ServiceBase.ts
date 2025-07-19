/**
 * Base Service Class with Dependency Injection
 * 
 * This base class provides:
 * - Dependency injection capabilities
 * - Common service patterns
 * - Error handling and logging
 * - Testability through injectable dependencies
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../logger';

export interface ServiceDependencies {
  supabaseClient?: SupabaseClient;
  logger?: typeof logger;
  [key: string]: any;
}

export interface ServiceConfig {
  name: string;
  dependencies?: ServiceDependencies;
  options?: Record<string, any>;
}

export abstract class ServiceBase {
  protected serviceName: string;
  protected logger: typeof logger;
  protected supabaseClient?: SupabaseClient;
  protected dependencies: ServiceDependencies;
  protected config: Record<string, any>;

  constructor(config: ServiceConfig) {
    this.serviceName = config.name;
    this.dependencies = config.dependencies || {};
    this.config = config.options || {};
    
    // Inject dependencies
    this.logger = this.dependencies.logger || logger;
    this.supabaseClient = this.dependencies.supabaseClient;
    
    this.logServiceInit();
  }

  /**
   * Initialize the service - called after dependency injection
   * Override this method in subclasses for custom initialization
   */
  protected initialize(): void | Promise<void> {
    // Default implementation - override in subclasses
  }

  /**
   * Get the service name
   */
  getName(): string {
    return this.serviceName;
  }

  /**
   * Get a dependency by key
   */
  protected getDependency<T>(key: string): T | undefined {
    return this.dependencies[key] as T;
  }

  /**
   * Check if the service has been properly initialized
   */
  protected validateDependencies(required: string[] = []): void {
    const missing = required.filter(dep => !this.dependencies[dep]);
    if (missing.length > 0) {
      throw new Error(`Missing required dependencies for ${this.serviceName}: ${missing.join(', ')}`);
    }
  }

  /**
   * Helper method for logging service initialization
   */
  private logServiceInit(): void {
    this.logger.debug(`Initializing service: ${this.serviceName}`, {
      dependencies: Object.keys(this.dependencies),
      config: Object.keys(this.config)
    });
  }

  /**
   * Helper method for handling service errors
   */
  protected handleError(error: any, context?: string): never {
    const errorContext = context ? `${this.serviceName}.${context}` : this.serviceName;
    this.logger.error(`Error in ${errorContext}:`, error);
    throw error;
  }

  /**
   * Helper method for handling service errors without throwing
   */
  protected logError(error: any, context?: string): void {
    const errorContext = context ? `${this.serviceName}.${context}` : this.serviceName;
    this.logger.error(`Error in ${errorContext}:`, error);
  }

  /**
   * Helper method for logging service operations
   */
  protected logOperation(operation: string, data?: any): void {
    this.logger.debug(`${this.serviceName}.${operation}`, data);
  }

  /**
   * Wrapper for async operations with error handling
   */
  protected async executeOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    errorContext?: string
  ): Promise<T> {
    try {
      this.logOperation(operation);
      return await fn();
    } catch (error) {
      this.handleError(error, errorContext || operation);
    }
  }
}

/**
 * Service Factory Interface
 */
export interface ServiceFactory<T extends ServiceBase> {
  create(dependencies?: ServiceDependencies, options?: Record<string, any>): T;
}

/**
 * Abstract factory base class
 */
export abstract class BaseServiceFactory<T extends ServiceBase> implements ServiceFactory<T> {
  abstract create(dependencies?: ServiceDependencies, options?: Record<string, any>): T;
}

/**
 * Wrapper for service methods to add automatic error handling
 */
export function withServiceMethod<T extends any[], R>(
  instance: ServiceBase,
  methodName: string,
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      instance.logOperation(methodName, { args: args.length });
      return await fn(...args);
    } catch (error) {
      return instance.handleError(error, methodName);
    }
  };
}

/**
 * Helper function to create service instances with dependency injection
 */
export function createService<T extends ServiceBase>(
  ServiceClass: new (config: ServiceConfig) => T,
  name: string,
  dependencies?: ServiceDependencies,
  options?: Record<string, any>
): T {
  return new ServiceClass({
    name,
    dependencies,
    options
  });
}

/**
 * Service container for managing service instances
 */
export class ServiceContainer {
  private services = new Map<string, ServiceBase>();
  private factories = new Map<string, ServiceFactory<any>>();

  /**
   * Register a service factory
   */
  registerFactory<T extends ServiceBase>(name: string, factory: ServiceFactory<T>): void {
    this.factories.set(name, factory);
  }

  /**
   * Get or create a service instance
   */
  getService<T extends ServiceBase>(
    name: string,
    dependencies?: ServiceDependencies,
    options?: Record<string, any>
  ): T {
    // Check if we already have an instance
    if (this.services.has(name)) {
      return this.services.get(name) as T;
    }

    // Check if we have a factory for this service
    const factory = this.factories.get(name);
    if (!factory) {
      throw new Error(`No factory registered for service: ${name}`);
    }

    // Create new instance
    const service = factory.create(dependencies, options);
    this.services.set(name, service);
    return service;
  }

  /**
   * Clear all cached service instances
   */
  clear(): void {
    this.services.clear();
  }

  /**
   * Get all registered service names
   */
  getRegisteredServices(): string[] {
    return Array.from(this.factories.keys());
  }
}

/**
 * Global service container instance
 */
export const serviceContainer = new ServiceContainer();