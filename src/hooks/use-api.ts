'use client';

import { useState, useCallback } from 'react';

interface UseApiOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
}

interface UseApiReturn<T, P = void> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: P extends void ? () => Promise<T | null> : (params: P) => Promise<T | null>;
  reset: () => void;
}

export function useApi<T, P = void>(
  fetcher: P extends void ? () => Promise<Response> : (params: P) => Promise<Response>,
  options?: UseApiOptions<T>
): UseApiReturn<T, P> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (params?: P): Promise<T | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await (params !== undefined ? (fetcher as (p: P) => Promise<Response>)(params) : (fetcher as () => Promise<Response>)());
        const result = await response.json();

        if (!response.ok || !result.success) {
          const errorMessage = result.error || 'An error occurred';
          setError(errorMessage);
          options?.onError?.(errorMessage);
          return null;
        }

        setData(result.data);
        options?.onSuccess?.(result.data);
        return result.data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        options?.onError?.(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetcher, options]
  ) as UseApiReturn<T, P>['execute'];

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, execute, reset };
}

// Pre-built API hooks for common operations
export function useFetch<T>(url: string, options?: UseApiOptions<T>) {
  return useApi<T>(
    () => fetch(url),
    options
  );
}

export function usePost<T, P>(url: string, options?: UseApiOptions<T>) {
  return useApi<T, P>(
    ((body: P) =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })) as P extends void ? () => Promise<Response> : (params: P) => Promise<Response>,
    options
  );
}

export function usePatch<T, P>(url: string, options?: UseApiOptions<T>) {
  return useApi<T, P>(
    ((body: P) =>
      fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })) as P extends void ? () => Promise<Response> : (params: P) => Promise<Response>,
    options
  );
}

export function useDelete<T>(url: string, options?: UseApiOptions<T>) {
  return useApi<T>(
    () => fetch(url, { method: 'DELETE' }),
    options
  );
}

// Paginated fetch hook
interface PaginatedData<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export function usePaginatedFetch<T>(baseUrl: string) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(
    async (newPage?: number, newLimit?: number, filters?: Record<string, string>) => {
      const currentPage = newPage ?? page;
      const currentLimit = newLimit ?? limit;

      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(currentLimit),
        ...filters,
      });

      try {
        const response = await fetch(`${baseUrl}?${params}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          setError(result.error || 'Failed to fetch');
          return;
        }

        setItems(result.data);
        setTotal(result.pagination?.total || result.total || 0);
        if (newPage) setPage(newPage);
        if (newLimit) setLimit(newLimit);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch');
      } finally {
        setLoading(false);
      }
    },
    [baseUrl, page, limit]
  );

  const nextPage = useCallback(() => {
    if (page < Math.ceil(total / limit)) {
      fetch_(page + 1);
    }
  }, [fetch_, page, total, limit]);

  const prevPage = useCallback(() => {
    if (page > 1) {
      fetch_(page - 1);
    }
  }, [fetch_, page]);

  const goToPage = useCallback(
    (p: number) => {
      fetch_(p);
    },
    [fetch_]
  );

  return {
    items,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    loading,
    error,
    fetch: fetch_,
    nextPage,
    prevPage,
    goToPage,
    setLimit: (l: number) => fetch_(1, l),
  };
}
