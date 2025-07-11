import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
    hasNextPage?: boolean;
    hasPrevPage?: boolean;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface RequestOptions {
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
  errorMessage?: string;
  retry?: boolean;
  retryCount?: number;
  retryDelay?: number;
  timeout?: number;
  signal?: AbortSignal;
}

export interface UseApiQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'> {
  requestOptions?: RequestOptions;
}

export interface UseApiMutationOptions<T, V> extends Omit<UseMutationOptions<T, Error, V>, 'mutationFn'> {
  requestOptions?: RequestOptions;
}

export interface UseApiReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isValidating: boolean;
  isStale: boolean;
}

export interface UseApiMutationReturn<T, V> {
  mutate: (variables: V) => Promise<T>;
  mutateAsync: (variables: V) => Promise<T>;
  loading: boolean;
  error: Error | null;
  isSuccess: boolean;
  isError: boolean;
  reset: () => void;
}

export interface UsePaginatedApiReturn<T> extends UseApiReturn<PaginatedResponse<T>> {
  items: T[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  refresh: () => Promise<void>;
}

export interface ApiConfig {
  baseURL: string;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

// API client configuration
let apiConfig: ApiConfig = {
  baseURL: '/api',
  timeout: 10000,
  retryCount: 3,
  retryDelay: 1000,
  headers: {
    'Content-Type': 'application/json',
  },
};

export const configureAPI = (config: Partial<ApiConfig>) => {
  apiConfig = { ...apiConfig, ...config };
};

// Generic API request function
export const makeRequest = async <T>(
  url: string,
  options: RequestInit & { timeout?: number; retryCount?: number; retryDelay?: number } = {}
): Promise<APIResponse<T>> => {
  const {
    timeout = apiConfig.timeout,
    retryCount = apiConfig.retryCount,
    retryDelay = apiConfig.retryDelay,
    headers = {},
    ...fetchOptions
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const requestHeaders = {
    ...apiConfig.headers,
    ...headers,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retryCount!; attempt++) {
    try {
      const response = await fetch(`${apiConfig.baseURL}${url}`, {
        ...fetchOptions,
        headers: requestHeaders,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < retryCount! && !controller.signal.aborted) {
        await new Promise(resolve => setTimeout(resolve, retryDelay! * Math.pow(2, attempt)));
        continue;
      }
      
      break;
    }
  }

  return {
    success: false,
    error: {
      message: lastError?.message || 'Request failed',
      code: lastError?.name,
      details: lastError,
    },
  };
};

// Generic query hook
export const useApiQuery = <T>(
  queryKey: (string | number)[],
  url: string,
  options: UseApiQueryOptions<T> = {}
): UseApiReturn<T> => {
  const { requestOptions = {}, ...queryOptions } = options;
  
  const {
    data,
    isLoading: loading,
    error,
    refetch,
    isValidating,
    isStale,
  } = useQuery<T, Error>({
    queryKey,
    queryFn: async () => {
      const response = await makeRequest<T>(url);
      
      if (!response.success) {
        if (requestOptions.showErrorToast !== false) {
          toast.error(requestOptions.errorMessage || response.error?.message || 'Request failed');
        }
        throw new Error(response.error?.message || 'Request failed');
      }
      
      return response.data!;
    },
    ...queryOptions,
  });

  const handleRefetch = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    data: data || null,
    loading,
    error,
    refetch: handleRefetch,
    isValidating,
    isStale,
  };
};

// Generic mutation hook
export const useApiMutation = <T, V>(
  url: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST',
  options: UseApiMutationOptions<T, V> = {}
): UseApiMutationReturn<T, V> => {
  const queryClient = useQueryClient();
  const { requestOptions = {}, ...mutationOptions } = options;

  const {
    mutate,
    mutateAsync,
    isLoading: loading,
    error,
    isSuccess,
    isError,
    reset,
  } = useMutation<T, Error, V>({
    mutationFn: async (variables: V) => {
      const response = await makeRequest<T>(url, {
        method,
        body: JSON.stringify(variables),
      });

      if (!response.success) {
        if (requestOptions.showErrorToast !== false) {
          toast.error(requestOptions.errorMessage || response.error?.message || 'Request failed');
        }
        throw new Error(response.error?.message || 'Request failed');
      }

      if (requestOptions.showSuccessToast !== false) {
        toast.success(requestOptions.successMessage || 'Operation completed successfully');
      }

      return response.data!;
    },
    onSuccess: (data, variables, context) => {
      // Invalidate related queries
      queryClient.invalidateQueries();
      
      if (mutationOptions.onSuccess) {
        mutationOptions.onSuccess(data, variables, context);
      }
    },
    onError: (error, variables, context) => {
      if (mutationOptions.onError) {
        mutationOptions.onError(error, variables, context);
      }
    },
    ...mutationOptions,
  });

  const handleMutate = useCallback(async (variables: V) => {
    return mutateAsync(variables);
  }, [mutateAsync]);

  return {
    mutate: handleMutate,
    mutateAsync,
    loading,
    error,
    isSuccess,
    isError,
    reset,
  };
};

// Paginated query hook
export const usePaginatedApiQuery = <T>(
  queryKey: (string | number)[],
  url: string,
  initialPage: number = 1,
  initialLimit: number = 10,
  options: UseApiQueryOptions<PaginatedResponse<T>> = {}
): UsePaginatedApiReturn<T> => {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);

  const paginatedUrl = `${url}?page=${page}&limit=${limit}`;
  const paginatedQueryKey = [...queryKey, 'paginated', page, limit];

  const {
    data,
    loading,
    error,
    refetch,
    isValidating,
    isStale,
  } = useApiQuery<PaginatedResponse<T>>(paginatedQueryKey, paginatedUrl, options);

  const goToPage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const nextPage = useCallback(() => {
    if (data?.hasNextPage) {
      setPage(prev => prev + 1);
    }
  }, [data?.hasNextPage]);

  const prevPage = useCallback(() => {
    if (data?.hasPrevPage) {
      setPage(prev => prev - 1);
    }
  }, [data?.hasPrevPage]);

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    data,
    loading,
    error,
    refetch,
    isValidating,
    isStale,
    items: data?.items || [],
    totalCount: data?.total || 0,
    currentPage: page,
    totalPages: data?.totalPages || 1,
    hasNextPage: data?.hasNextPage || false,
    hasPrevPage: data?.hasPrevPage || false,
    goToPage,
    nextPage,
    prevPage,
    refresh,
  };
};

// Infinite query hook
export const useInfiniteApiQuery = <T>(
  queryKey: (string | number)[],
  url: string,
  options: UseApiQueryOptions<PaginatedResponse<T>> = {}
) => {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    try {
      const response = await makeRequest<PaginatedResponse<T>>(`${url}?page=${page}&limit=10`);
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Request failed');
      }

      const newData = response.data!;
      setItems(prev => [...prev, ...newData.items]);
      setHasMore(newData.hasNextPage);
      setPage(prev => prev + 1);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [url, page, loading, hasMore]);

  const reset = useCallback(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    setError(null);
  }, []);

  useEffect(() => {
    loadMore();
  }, []); // Only load on mount

  return {
    items,
    loading,
    error,
    hasMore,
    loadMore,
    reset,
  };
};

// Debounced search hook
export const useDebounceSearch = <T>(
  queryKey: (string | number)[],
  url: string,
  delay: number = 500,
  options: UseApiQueryOptions<T[]> = {}
) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, delay);

    return () => clearTimeout(timer);
  }, [searchTerm, delay]);

  const searchUrl = debouncedTerm ? `${url}?q=${encodeURIComponent(debouncedTerm)}` : url;
  const searchQueryKey = [...queryKey, 'search', debouncedTerm];

  const {
    data,
    loading,
    error,
    refetch,
  } = useApiQuery<T[]>(searchQueryKey, searchUrl, {
    ...options,
    enabled: debouncedTerm.length > 0,
  });

  return {
    searchTerm,
    setSearchTerm,
    results: data || [],
    loading,
    error,
    refetch,
  };
};

// Real-time data hook
export const useRealTimeData = <T>(
  queryKey: (string | number)[],
  url: string,
  interval: number = 5000,
  options: UseApiQueryOptions<T> = {}
) => {
  const {
    data,
    loading,
    error,
    refetch,
    isValidating,
    isStale,
  } = useApiQuery<T>(queryKey, url, {
    ...options,
    refetchInterval: interval,
    refetchIntervalInBackground: true,
  });

  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);

  const enableRealTime = useCallback(() => {
    setIsRealTimeEnabled(true);
  }, []);

  const disableRealTime = useCallback(() => {
    setIsRealTimeEnabled(false);
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    isValidating,
    isStale,
    isRealTimeEnabled,
    enableRealTime,
    disableRealTime,
  };
};

// Cache management utilities
export const useCacheManager = () => {
  const queryClient = useQueryClient();

  const clearCache = useCallback((queryKey?: (string | number)[]) => {
    if (queryKey) {
      queryClient.removeQueries({ queryKey });
    } else {
      queryClient.clear();
    }
  }, [queryClient]);

  const invalidateCache = useCallback((queryKey?: (string | number)[]) => {
    if (queryKey) {
      queryClient.invalidateQueries({ queryKey });
    } else {
      queryClient.invalidateQueries();
    }
  }, [queryClient]);

  const prefetchData = useCallback(async <T>(
    queryKey: (string | number)[],
    url: string,
    options: UseApiQueryOptions<T> = {}
  ) => {
    await queryClient.prefetchQuery({
      queryKey,
      queryFn: async () => {
        const response = await makeRequest<T>(url);
        if (!response.success) {
          throw new Error(response.error?.message || 'Request failed');
        }
        return response.data!;
      },
      ...options,
    });
  }, [queryClient]);

  const getCachedData = useCallback(<T>(queryKey: (string | number)[]): T | undefined => {
    return queryClient.getQueryData<T>(queryKey);
  }, [queryClient]);

  const setCachedData = useCallback(<T>(queryKey: (string | number)[], data: T) => {
    queryClient.setQueryData<T>(queryKey, data);
  }, [queryClient]);

  return {
    clearCache,
    invalidateCache,
    prefetchData,
    getCachedData,
    setCachedData,
  };
};

// Error boundary for API errors
export const useErrorHandler = () => {
  const [error, setError] = useState<Error | null>(null);

  const handleError = useCallback((error: Error) => {
    setError(error);
    console.error('API Error:', error);
    
    // You can add global error handling logic here
    // For example, redirect to login on 401 errors
    if (error.message.includes('401')) {
      // Handle authentication error
      window.location.href = '/login';
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleError,
    clearError,
  };
};

// Optimistic updates hook
export const useOptimisticUpdate = <T, V>(
  queryKey: (string | number)[],
  updateFn: (oldData: T, variables: V) => T
) => {
  const queryClient = useQueryClient();

  const performOptimisticUpdate = useCallback(async (
    variables: V,
    mutationFn: (variables: V) => Promise<T>
  ) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey });

    // Snapshot the previous value
    const previousData = queryClient.getQueryData<T>(queryKey);

    // Optimistically update
    if (previousData) {
      queryClient.setQueryData<T>(queryKey, updateFn(previousData, variables));
    }

    try {
      // Perform the mutation
      const result = await mutationFn(variables);
      
      // Update with the actual result
      queryClient.setQueryData<T>(queryKey, result);
      
      return result;
    } catch (error) {
      // Rollback on error
      queryClient.setQueryData<T>(queryKey, previousData);
      throw error;
    }
  }, [queryClient, queryKey, updateFn]);

  return {
    performOptimisticUpdate,
  };
};