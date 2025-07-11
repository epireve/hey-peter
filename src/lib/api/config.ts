/**
 * API Client Configuration
 * 
 * Environment-specific configurations for the API client
 */

import { ApiClientConfig } from './client';
import { LogLevel } from '@/lib/services/logger';

// =============================================================================
// Environment Detection
// =============================================================================

export const ENV = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test',
  STAGING: 'staging',
} as const;

export type Environment = typeof ENV[keyof typeof ENV];

export function getCurrentEnvironment(): Environment {
  const nodeEnv = process.env.NODE_ENV as Environment;
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV as Environment;
  
  return appEnv || nodeEnv || ENV.DEVELOPMENT;
}

// =============================================================================
// Base Configuration
// =============================================================================

const baseConfig: Partial<ApiClientConfig> = {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Client-Version': process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    'X-Client-Platform': typeof window !== 'undefined' ? 'web' : 'server',
  },
  authConfig: {
    tokenKey: 'heyPeter_accessToken',
    refreshTokenKey: 'heyPeter_refreshToken',
    authHeaderPrefix: 'Bearer',
    autoRefresh: true,
  },
};

// =============================================================================
// Environment-Specific Configurations
// =============================================================================

const developmentConfig: Partial<ApiClientConfig> = {
  ...baseConfig,
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  timeout: 60000, // 60 seconds for development
  retryAttempts: 2,
  retryDelay: 1000,
  retryMultiplier: 2,
  maxRetryDelay: 5000,
  enableCache: true,
  cacheTimeout: 300000, // 5 minutes
  enableLogging: true,
  logLevel: 'debug',
  headers: {
    ...baseConfig.headers,
    'X-Environment': ENV.DEVELOPMENT,
  },
};

const productionConfig: Partial<ApiClientConfig> = {
  ...baseConfig,
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000,
  retryMultiplier: 2,
  maxRetryDelay: 10000,
  enableCache: true,
  cacheTimeout: 600000, // 10 minutes
  enableLogging: true,
  logLevel: 'error',
  headers: {
    ...baseConfig.headers,
    'X-Environment': ENV.PRODUCTION,
  },
};

const testConfig: Partial<ApiClientConfig> = {
  ...baseConfig,
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  timeout: 10000, // 10 seconds for tests
  retryAttempts: 1,
  retryDelay: 500,
  retryMultiplier: 1,
  maxRetryDelay: 1000,
  enableCache: false, // Disable cache in tests
  cacheTimeout: 0,
  enableLogging: false, // Disable logging in tests
  logLevel: 'error',
  headers: {
    ...baseConfig.headers,
    'X-Environment': ENV.TEST,
  },
};

const stagingConfig: Partial<ApiClientConfig> = {
  ...baseConfig,
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  retryMultiplier: 2,
  maxRetryDelay: 8000,
  enableCache: true,
  cacheTimeout: 300000, // 5 minutes
  enableLogging: true,
  logLevel: 'info',
  headers: {
    ...baseConfig.headers,
    'X-Environment': ENV.STAGING,
  },
};

// =============================================================================
// Configuration Factory
// =============================================================================

export function getApiConfig(environment?: Environment): Partial<ApiClientConfig> {
  const env = environment || getCurrentEnvironment();

  switch (env) {
    case ENV.DEVELOPMENT:
      return developmentConfig;
    case ENV.PRODUCTION:
      return productionConfig;
    case ENV.TEST:
      return testConfig;
    case ENV.STAGING:
      return stagingConfig;
    default:
      return developmentConfig;
  }
}

// =============================================================================
// Feature Flags
// =============================================================================

export interface FeatureFlags {
  enableRequestDeduplication: boolean;
  enableResponseCaching: boolean;
  enableRetryMechanism: boolean;
  enableTokenAutoRefresh: boolean;
  enableRequestLogging: boolean;
  enablePerformanceMetrics: boolean;
  enableErrorReporting: boolean;
  enableOfflineSupport: boolean;
  enableRequestInterception: boolean;
}

export function getFeatureFlags(environment?: Environment): FeatureFlags {
  const env = environment || getCurrentEnvironment();

  const baseFlags: FeatureFlags = {
    enableRequestDeduplication: true,
    enableResponseCaching: true,
    enableRetryMechanism: true,
    enableTokenAutoRefresh: true,
    enableRequestLogging: true,
    enablePerformanceMetrics: true,
    enableErrorReporting: true,
    enableOfflineSupport: false,
    enableRequestInterception: true,
  };

  switch (env) {
    case ENV.DEVELOPMENT:
      return {
        ...baseFlags,
        enableRequestLogging: true,
        enablePerformanceMetrics: true,
      };

    case ENV.PRODUCTION:
      return {
        ...baseFlags,
        enableRequestLogging: false,
        enablePerformanceMetrics: false,
      };

    case ENV.TEST:
      return {
        ...baseFlags,
        enableRequestDeduplication: false,
        enableResponseCaching: false,
        enableRetryMechanism: false,
        enableRequestLogging: false,
        enablePerformanceMetrics: false,
        enableErrorReporting: false,
      };

    case ENV.STAGING:
      return {
        ...baseFlags,
        enableRequestLogging: true,
        enablePerformanceMetrics: true,
      };

    default:
      return baseFlags;
  }
}

// =============================================================================
// API Rate Limits
// =============================================================================

export interface RateLimitConfig {
  maxRequestsPerSecond: number;
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  burstLimit: number;
  windowSizeMs: number;
}

export function getRateLimitConfig(environment?: Environment): RateLimitConfig {
  const env = environment || getCurrentEnvironment();

  const baseConfig: RateLimitConfig = {
    maxRequestsPerSecond: 10,
    maxRequestsPerMinute: 300,
    maxRequestsPerHour: 5000,
    burstLimit: 20,
    windowSizeMs: 1000,
  };

  switch (env) {
    case ENV.DEVELOPMENT:
      return {
        ...baseConfig,
        maxRequestsPerSecond: 20,
        maxRequestsPerMinute: 600,
        burstLimit: 50,
      };

    case ENV.PRODUCTION:
      return baseConfig;

    case ENV.TEST:
      return {
        ...baseConfig,
        maxRequestsPerSecond: 100,
        maxRequestsPerMinute: 1000,
        maxRequestsPerHour: 10000,
        burstLimit: 200,
      };

    case ENV.STAGING:
      return {
        ...baseConfig,
        maxRequestsPerSecond: 15,
        maxRequestsPerMinute: 450,
        burstLimit: 30,
      };

    default:
      return baseConfig;
  }
}

// =============================================================================
// Cache Configuration
// =============================================================================

export interface CacheConfig {
  defaultTtl: number;
  maxSize: number;
  cleanupIntervalMs: number;
  enablePersistedCache: boolean;
  cacheKeyPrefix: string;
  compressionEnabled: boolean;
}

export function getCacheConfig(environment?: Environment): CacheConfig {
  const env = environment || getCurrentEnvironment();

  const baseConfig: CacheConfig = {
    defaultTtl: 300000, // 5 minutes
    maxSize: 1000,
    cleanupIntervalMs: 300000, // 5 minutes
    enablePersistedCache: true,
    cacheKeyPrefix: 'heyPeter_api_',
    compressionEnabled: true,
  };

  switch (env) {
    case ENV.DEVELOPMENT:
      return {
        ...baseConfig,
        defaultTtl: 60000, // 1 minute
        maxSize: 500,
        enablePersistedCache: false,
      };

    case ENV.PRODUCTION:
      return {
        ...baseConfig,
        defaultTtl: 600000, // 10 minutes
        maxSize: 2000,
      };

    case ENV.TEST:
      return {
        ...baseConfig,
        defaultTtl: 0, // No caching in tests
        maxSize: 0,
        enablePersistedCache: false,
        compressionEnabled: false,
      };

    case ENV.STAGING:
      return {
        ...baseConfig,
        defaultTtl: 300000, // 5 minutes
        maxSize: 1000,
      };

    default:
      return baseConfig;
  }
}

// =============================================================================
// Security Configuration
// =============================================================================

export interface SecurityConfig {
  enableCSRFProtection: boolean;
  enableCORS: boolean;
  allowedOrigins: string[];
  maxPayloadSize: number;
  encryptSensitiveData: boolean;
  enableRequestSigning: boolean;
  tokenExpirationBuffer: number; // ms before expiration to refresh
}

export function getSecurityConfig(environment?: Environment): SecurityConfig {
  const env = environment || getCurrentEnvironment();

  const baseConfig: SecurityConfig = {
    enableCSRFProtection: true,
    enableCORS: true,
    allowedOrigins: ['http://localhost:3000'],
    maxPayloadSize: 10 * 1024 * 1024, // 10MB
    encryptSensitiveData: true,
    enableRequestSigning: false,
    tokenExpirationBuffer: 300000, // 5 minutes
  };

  switch (env) {
    case ENV.DEVELOPMENT:
      return {
        ...baseConfig,
        enableCSRFProtection: false,
        allowedOrigins: ['http://localhost:3000', 'http://localhost:3001'],
        encryptSensitiveData: false,
      };

    case ENV.PRODUCTION:
      return {
        ...baseConfig,
        allowedOrigins: [
          process.env.NEXT_PUBLIC_APP_URL || 'https://app.heypeter.academy',
          'https://heypeter.academy',
        ],
        enableRequestSigning: true,
      };

    case ENV.TEST:
      return {
        ...baseConfig,
        enableCSRFProtection: false,
        enableCORS: false,
        allowedOrigins: ['http://localhost:3000'],
        encryptSensitiveData: false,
        enableRequestSigning: false,
      };

    case ENV.STAGING:
      return {
        ...baseConfig,
        allowedOrigins: [
          process.env.NEXT_PUBLIC_APP_URL || 'https://staging.heypeter.academy',
        ],
      };

    default:
      return baseConfig;
  }
}

// =============================================================================
// Monitoring Configuration
// =============================================================================

export interface MonitoringConfig {
  enableMetrics: boolean;
  enableTracing: boolean;
  sampleRate: number;
  errorReportingEndpoint?: string;
  metricsEndpoint?: string;
  enableHealthChecks: boolean;
  healthCheckInterval: number;
}

export function getMonitoringConfig(environment?: Environment): MonitoringConfig {
  const env = environment || getCurrentEnvironment();

  const baseConfig: MonitoringConfig = {
    enableMetrics: true,
    enableTracing: true,
    sampleRate: 0.1, // 10%
    errorReportingEndpoint: process.env.NEXT_PUBLIC_ERROR_REPORTING_ENDPOINT,
    metricsEndpoint: process.env.NEXT_PUBLIC_METRICS_ENDPOINT,
    enableHealthChecks: true,
    healthCheckInterval: 30000, // 30 seconds
  };

  switch (env) {
    case ENV.DEVELOPMENT:
      return {
        ...baseConfig,
        sampleRate: 1.0, // 100% in development
        enableHealthChecks: false,
      };

    case ENV.PRODUCTION:
      return {
        ...baseConfig,
        sampleRate: 0.01, // 1% in production
      };

    case ENV.TEST:
      return {
        ...baseConfig,
        enableMetrics: false,
        enableTracing: false,
        sampleRate: 0,
        enableHealthChecks: false,
      };

    case ENV.STAGING:
      return {
        ...baseConfig,
        sampleRate: 0.5, // 50% in staging
      };

    default:
      return baseConfig;
  }
}

// =============================================================================
// Combined Configuration
// =============================================================================

export interface ApiConfiguration {
  client: Partial<ApiClientConfig>;
  features: FeatureFlags;
  rateLimit: RateLimitConfig;
  cache: CacheConfig;
  security: SecurityConfig;
  monitoring: MonitoringConfig;
  environment: Environment;
}

export function getApiConfiguration(environment?: Environment): ApiConfiguration {
  const env = environment || getCurrentEnvironment();

  return {
    client: getApiConfig(env),
    features: getFeatureFlags(env),
    rateLimit: getRateLimitConfig(env),
    cache: getCacheConfig(env),
    security: getSecurityConfig(env),
    monitoring: getMonitoringConfig(env),
    environment: env,
  };
}

// =============================================================================
// Configuration Validation
// =============================================================================

export function validateConfiguration(config: ApiConfiguration): boolean {
  const errors: string[] = [];

  // Validate client config
  if (!config.client.baseURL) {
    errors.push('baseURL is required');
  }

  if (!config.client.timeout || config.client.timeout <= 0) {
    errors.push('timeout must be a positive number');
  }

  // Validate rate limit config
  if (config.rateLimit.maxRequestsPerSecond <= 0) {
    errors.push('maxRequestsPerSecond must be positive');
  }

  // Validate cache config
  if (config.cache.maxSize < 0) {
    errors.push('cache maxSize cannot be negative');
  }

  // Validate security config
  if (config.security.maxPayloadSize <= 0) {
    errors.push('maxPayloadSize must be positive');
  }

  if (errors.length > 0) {
    console.error('API Configuration validation errors:', errors);
    return false;
  }

  return true;
}

// =============================================================================
// Default Export
// =============================================================================

export default getApiConfiguration();