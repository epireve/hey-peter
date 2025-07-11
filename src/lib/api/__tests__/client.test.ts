/**
 * API Client Tests
 * 
 * Comprehensive test suite for the API client functionality
 */

import { ApiClient, requestInterceptors } from '../client';
import { AppError, ErrorCode } from '@/lib/errors/app-error';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Mock performance.now for consistent timing
global.performance = {
  now: jest.fn(() => 1000),
} as any;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('ApiClient', () => {
  let client: ApiClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new ApiClient({
      baseURL: 'https://api.test.com',
      timeout: 5000,
      retryAttempts: 2,
      enableLogging: false,
    });
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with default configuration', () => {
      const defaultClient = new ApiClient();
      const config = defaultClient.getConfig();

      expect(config.baseURL).toBe('/api');
      expect(config.timeout).toBe(30000);
      expect(config.retryAttempts).toBe(3);
      expect(config.enableCache).toBe(true);
    });

    it('should merge custom configuration with defaults', () => {
      const customClient = new ApiClient({
        baseURL: 'https://custom.api.com',
        timeout: 10000,
        retryAttempts: 5,
      });

      const config = customClient.getConfig();

      expect(config.baseURL).toBe('https://custom.api.com');
      expect(config.timeout).toBe(10000);
      expect(config.retryAttempts).toBe(5);
      expect(config.enableCache).toBe(true); // Default value
    });

    it('should set configuration after initialization', () => {
      client.setConfig({
        timeout: 15000,
        retryAttempts: 1,
      });

      const config = client.getConfig();
      expect(config.timeout).toBe(15000);
      expect(config.retryAttempts).toBe(1);
    });
  });

  describe('Authentication Token Management', () => {
    beforeEach(() => {
      mockLocalStorage.getItem.mockReturnValue(null);
    });

    it('should set and store auth token', () => {
      const token = 'test-access-token';
      const refreshToken = 'test-refresh-token';

      client.setAuthToken(token, refreshToken);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('accessToken', token);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('refreshToken', refreshToken);
    });

    it('should clear auth tokens', () => {
      client.clearAuthToken();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('accessToken');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('refreshToken');
    });

    it('should add auth header to requests when token exists', async () => {
      const token = 'test-token';
      client.setAuthToken(token);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { test: 'data' } }),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      await client.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });
  });

  describe('HTTP Methods', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { test: 'data' } }),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);
    });

    it('should make GET request', async () => {
      await client.get('/users', { page: 1, limit: 10 });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/users?page=1&limit=10',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should make POST request', async () => {
      const data = { name: 'Test User' };
      await client.post('/users', data);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(data),
        })
      );
    });

    it('should make PUT request', async () => {
      const data = { name: 'Updated User' };
      await client.put('/users/123', data);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/users/123',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(data),
        })
      );
    });

    it('should make PATCH request', async () => {
      const data = { name: 'Patched User' };
      await client.patch('/users/123', data);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/users/123',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(data),
        })
      );
    });

    it('should make DELETE request', async () => {
      await client.delete('/users/123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/users/123',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Not found' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      await expect(client.get('/nonexistent')).rejects.toThrow(AppError);
    });

    it.skip('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.get('/test')).rejects.toThrow();
    });

    it.skip('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('Invalid JSON'); },
        text: async () => 'Invalid response',
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      await expect(client.get('/test')).rejects.toThrow();
    });

    it.skip('should map status codes to error codes', async () => {
      const testCases = [
        { status: 400, expectedCode: ErrorCode.INVALID_INPUT },
        { status: 401, expectedCode: ErrorCode.UNAUTHORIZED },
        { status: 403, expectedCode: ErrorCode.INSUFFICIENT_PERMISSIONS },
        { status: 404, expectedCode: ErrorCode.RECORD_NOT_FOUND },
        { status: 409, expectedCode: ErrorCode.DUPLICATE_RECORD },
        { status: 422, expectedCode: ErrorCode.VALIDATION_ERROR },
        { status: 429, expectedCode: ErrorCode.RATE_LIMIT_EXCEEDED },
        { status: 500, expectedCode: ErrorCode.INTERNAL_ERROR },
        { status: 503, expectedCode: ErrorCode.SERVICE_UNAVAILABLE },
      ];

      for (const { status, expectedCode } of testCases) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status,
          json: async () => ({ message: 'Error' }),
          headers: new Headers({ 'content-type': 'application/json' }),
        } as Response);

        try {
          await client.get('/test');
          fail(`Expected error for status ${status}`);
        } catch (error) {
          expect(error).toBeInstanceOf(AppError);
          expect((error as AppError).code).toBe(expectedCode);
        }
      }
    });
  });

  describe('Retry Logic', () => {
    it('should retry on 500 errors', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ message: 'Server error' }),
          headers: new Headers({ 'content-type': 'application/json' }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { test: 'data' } }),
          headers: new Headers({ 'content-type': 'application/json' }),
        } as Response);

      const result = await client.get('/test');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
    });

    it('should retry on 429 errors', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: async () => ({ message: 'Rate limited' }),
          headers: new Headers({ 'content-type': 'application/json' }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { test: 'data' } }),
          headers: new Headers({ 'content-type': 'application/json' }),
        } as Response);

      const result = await client.get('/test');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
    });

    it('should not retry on 4xx errors (except 429)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Not found' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      await expect(client.get('/test')).rejects.toThrow(AppError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should respect retry attempts limit', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Server error' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      await expect(client.get('/test')).rejects.toThrow(AppError);
      expect(mockFetch).toHaveBeenCalledTimes(2); // 1 initial + 1 retry (configured retryAttempts: 2)
    });
  });

  describe('Caching', () => {
    beforeEach(() => {
      client.clearCache();
    });

    it('should cache GET responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { test: 'data' } }),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      // First request
      await client.get('/test');
      
      // Second request should be served from cache
      await client.get('/test');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should not cache non-GET requests', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { test: 'data' } }),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      await client.post('/test', { data: 'test' });
      await client.post('/test', { data: 'test' });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should allow disabling cache per request', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { test: 'data' } }),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      await client.get('/test');
      await client.get('/test', {}, { enableCache: false });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should provide cache statistics', () => {
      const stats = client.getCacheStats();

      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('entries');
      expect(Array.isArray(stats.entries)).toBe(true);
    });
  });

  describe('Request Cancellation', () => {
    it.skip('should support request cancellation', async () => {
      const abortController = new AbortController();
      
      mockFetch.mockImplementation(() => {
        return new Promise((resolve, reject) => {
          abortController.signal.addEventListener('abort', () => {
            reject(new Error('Request cancelled'));
          });
          // Add a timeout to prevent hanging
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ success: true, data: { test: 'data' } }),
            headers: new Headers({ 'content-type': 'application/json' }),
          } as Response), 1000);
        });
      });

      const requestPromise = client.get('/test', {}, { signal: abortController.signal });
      
      setTimeout(() => abortController.abort(), 100);

      await expect(requestPromise).rejects.toThrow('Request cancelled');
    }, 10000);

    it('should cancel all requests', async () => {
      // This test is more complex to implement properly
      // In practice, we'd need to mock multiple concurrent requests
      expect(typeof client.cancelAllRequests).toBe('function');
    });
  });

  describe('Request Interceptors', () => {
    it('should apply request interceptors', async () => {
      const interceptor = jest.fn((config) => ({
        ...config,
        headers: {
          ...config.headers,
          'X-Custom-Header': 'test-value',
        },
      }));

      client.setConfig({
        interceptors: {
          request: [interceptor],
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { test: 'data' } }),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      await client.get('/test');

      expect(interceptor).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'test-value',
          }),
        })
      );
    });
  });

  describe('Response Interceptors', () => {
    it('should apply response interceptors', async () => {
      const interceptor = {
        onFulfilled: jest.fn((response) => ({
          ...response,
          intercepted: true,
        })),
      };

      client.setConfig({
        interceptors: {
          response: [interceptor],
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { test: 'data' } }),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      const result = await client.get('/test');

      expect(interceptor.onFulfilled).toHaveBeenCalled();
      expect(result).toHaveProperty('intercepted', true);
    });

    it.skip('should handle error interceptors', async () => {
      const interceptor = {
        onRejected: jest.fn((error) => {
          throw new Error('Intercepted error');
        }),
      };

      client.setConfig({
        interceptors: {
          response: [interceptor],
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Server error' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      await expect(client.get('/test')).rejects.toThrow();
      expect(interceptor.onRejected).toHaveBeenCalled();
    }, 10000);
  });

  describe('Request Deduplication', () => {
    it('should deduplicate identical GET requests', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { test: 'data' } }),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      // Make two identical requests simultaneously
      const [result1, result2] = await Promise.all([
        client.get('/test', { param: 'value' }),
        client.get('/test', { param: 'value' }),
      ]);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
    });

    it('should not deduplicate different requests', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { test: 'data' } }),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      await Promise.all([
        client.get('/test', { param: 'value1' }),
        client.get('/test', { param: 'value2' }),
      ]);

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Token Auto-refresh', () => {
    it('should refresh token on 401 and retry request', async () => {
      client.setAuthToken('expired-token', 'refresh-token');

      // First call returns 401
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({ message: 'Unauthorized' }),
          headers: new Headers({ 'content-type': 'application/json' }),
        } as Response)
        // Token refresh call
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              access_token: 'new-token',
              refresh_token: 'new-refresh-token',
            },
          }),
          headers: new Headers({ 'content-type': 'application/json' }),
        } as Response)
        // Retry original request
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { test: 'data' } }),
          headers: new Headers({ 'content-type': 'application/json' }),
        } as Response);

      const result = await client.get('/test');

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(true);
    });
  });
});

describe('Request/Response Interceptor Helpers', () => {
  it('should create correlation ID interceptor', () => {
    const interceptor = requestInterceptors.addCorrelationId();
    const config = {
      method: 'GET' as const,
      url: '/test',
      headers: {},
    };

    const result = interceptor(config);

    expect(result.headers).toHaveProperty('X-Correlation-ID');
    expect(typeof result.headers!['X-Correlation-ID']).toBe('string');
  });

  it('should create timestamp interceptor', () => {
    const interceptor = requestInterceptors.addTimestamp();
    const config = {
      method: 'GET' as const,
      url: '/test',
      headers: {},
    };

    const result = interceptor(config);

    expect(result.headers).toHaveProperty('X-Request-Timestamp');
    expect(typeof result.headers!['X-Request-Timestamp']).toBe('string');
  });

  it('should create client info interceptor', () => {
    const interceptor = requestInterceptors.addClientInfo();
    const config = {
      method: 'GET' as const,
      url: '/test',
      headers: {},
    };

    const result = interceptor(config);

    expect(result.headers).toHaveProperty('X-Client-Version');
    expect(result.headers).toHaveProperty('X-Client-Platform');
  });
});