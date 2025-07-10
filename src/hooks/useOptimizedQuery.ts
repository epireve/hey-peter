import { useQuery, useQueryClient, useInfiniteQuery as useInfiniteQueryBase } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import React from "react";
import { performanceMonitor } from "@/lib/utils/performance-monitor";

interface UseOptimizedQueryOptions<T> {
  queryKey: string[];
  queryFn: () => Promise<T>;
  staleTime?: number;
  cacheTime?: number;
  refetchInterval?: number;
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

/**
 * Optimized query hook with performance tracking and prefetching
 */
export function useOptimizedQuery<T>({
  queryKey,
  queryFn,
  staleTime = 5 * 60 * 1000, // 5 minutes
  cacheTime = 10 * 60 * 1000, // 10 minutes
  refetchInterval,
  enabled = true,
  onSuccess,
  onError,
}: UseOptimizedQueryOptions<T>) {
  const queryClient = useQueryClient();

  // Wrap query function with performance tracking
  const trackedQueryFn = useCallback(async () => {
    return performanceMonitor.trackAPI(
      `query:${queryKey.join(".")}`,
      queryFn,
      { queryKey }
    );
  }, [queryKey, queryFn]);

  const query = useQuery({
    queryKey,
    queryFn: trackedQueryFn,
    staleTime,
    cacheTime,
    refetchInterval,
    enabled,
    onSuccess,
    onError,
  });

  // Prefetch next page for pagination
  const prefetchNext = useCallback(
    async (nextKey: string[]) => {
      await queryClient.prefetchQuery({
        queryKey: nextKey,
        queryFn: trackedQueryFn,
        staleTime,
      });
    },
    [queryClient, trackedQueryFn, staleTime]
  );

  // Invalidate related queries
  const invalidateRelated = useCallback(
    (pattern: string) => {
      queryClient.invalidateQueries({
        predicate: (query) => 
          query.queryKey.some((key) => 
            typeof key === "string" && key.includes(pattern)
          ),
      });
    },
    [queryClient]
  );

  return {
    ...query,
    prefetchNext,
    invalidateRelated,
  };
}

/**
 * Hook for paginated queries with automatic prefetching
 */
export function usePaginatedQuery<T>({
  queryKey,
  queryFn,
  page = 1,
  pageSize = 10,
  ...options
}: UseOptimizedQueryOptions<T> & {
  page?: number;
  pageSize?: number;
}) {
  const paginatedKey = useMemo(
    () => [...queryKey, "page", page, "pageSize", pageSize],
    [queryKey, page, pageSize]
  );

  const query = useOptimizedQuery({
    ...options,
    queryKey: paginatedKey,
    queryFn,
  });

  // Prefetch next page automatically
  React.useEffect(() => {
    if (query.data && !query.isFetching) {
      const nextPageKey = [...queryKey, "page", page + 1, "pageSize", pageSize];
      query.prefetchNext(nextPageKey);
    }
  }, [query, queryKey, page, pageSize]);

  return query;
}

/**
 * Hook for infinite scroll queries
 */
export function useInfiniteOptimizedQuery<T>({
  queryKey,
  queryFn,
  getNextPageParam,
  ...options
}: UseOptimizedQueryOptions<T> & {
  getNextPageParam: (lastPage: T) => any;
}) {
  const queryClient = useQueryClient();

  const infiniteQuery = useInfiniteQueryBase({
    queryKey,
    queryFn: ({ pageParam = 0 }) =>
      performanceMonitor.trackAPI(
        `infinite:${queryKey.join(".")}`,
        () => queryFn(pageParam),
        { queryKey, pageParam }
      ),
    getNextPageParam,
    staleTime: options.staleTime,
    cacheTime: options.cacheTime,
    enabled: options.enabled,
  });

  // Prefetch next page when close to end
  const prefetchNextPage = useCallback(() => {
    if (infiniteQuery.hasNextPage && !infiniteQuery.isFetchingNextPage) {
      infiniteQuery.fetchNextPage();
    }
  }, [infiniteQuery]);

  return {
    ...infiniteQuery,
    prefetchNextPage,
  };
}