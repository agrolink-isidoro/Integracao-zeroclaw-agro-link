import { useMemo } from 'react'
import api from '../services/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query'
import type { AxiosRequestConfig } from 'axios'

export default function useApi() {
  // return the configured axios instance; keep wrapper to follow hooks convention
  return useMemo(() => ({
    client: api,
    get: (url: string, config?: AxiosRequestConfig) => api.get<unknown>(url, config),
    post: (url: string, data?: unknown, config?: AxiosRequestConfig) => api.post<unknown>(url, data, config),
    put: (url: string, data?: unknown, config?: AxiosRequestConfig) => api.put<unknown>(url, data, config),
    patch: (url: string, data?: unknown, config?: AxiosRequestConfig) => api.patch<unknown>(url, data, config),
    del: (url: string, config?: AxiosRequestConfig) => api.delete<unknown>(url, config),
    }), [])
  }

interface ApiError {
  message: string;
  status?: number;
}

// Hook para queries GET
export function useApiQuery<T>(
  key: string[],
  url: string,
  options?: Omit<UseQueryOptions<T, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<T, ApiError>({
    queryKey: key,
    queryFn: async () => {
      const response = await api.get(url);
      const data = response.data;
      // Normalize paginated responses: if backend returns {count, results, ...},
      // return the results array for components that expect an array.
      if (data && typeof data === 'object' && 'results' in data) {
        return data.results as unknown as T;
      }
      return data;
    },
    ...options
  });
}

// Hook para mutations (POST, PUT, DELETE)
export function useApiMutation<TData, TVariables extends Record<string, unknown>>(
  method: 'post' | 'put' | 'patch' | 'delete',
  url: string,
  options?: UseMutationOptions<TData, ApiError, TVariables>
) {
  const queryClient = useQueryClient();

  return useMutation<TData, ApiError, TVariables>({
    mutationFn: async (variables: TVariables) => {
      // For DELETE, append ID to URL if present
      if (method === 'delete' && 'id' in variables) {
        const response = await api.delete(`${url}${variables.id}/`);
        return response.data;
      }
      const response = await api[method](url, variables);
      return response.data;
    },
    ...options,
    onSuccess: (data, variables, context) => {
      // Invalidate related queries
      queryClient.invalidateQueries();

      // Call original onSuccess if provided
      if (options?.onSuccess) {
        // pass through the context provided by react-query
        // Use a compatible 4-argument call to match react-query's onSuccess signature
        // (data, variables, onMutateResult, context)
        options.onSuccess(data, variables, undefined as any, context as unknown as any);
      }
    }
  });
}

// Hook específico para CREATE
export function useApiCreate<TData, TVariables extends Record<string, unknown>>(
  url: string,
  invalidateKeys?: string[][],
  options?: UseMutationOptions<TData, ApiError, TVariables>
) {
  const queryClient = useQueryClient();

  return useMutation<TData, ApiError, TVariables>({
    mutationFn: async (variables: TVariables) => {
      console.log('=== DEBUG useApiCreate ===');
      console.log('URL:', url);
      console.log('Payload sendo enviado:', variables);
      console.log('==========================');
      
      try {
        // Support multipart uploads when caller passes FormData or { formData }
        if (variables instanceof FormData) {
          const response = await api.post(url, variables);
          return response.data;
        }
        if (variables && (variables as any).formData instanceof FormData) {
          const response = await api.post(url, (variables as any).formData);
          return response.data;
        }

        const response = await api.post(url, variables);

        console.log('=== RESPONSE useApiCreate ===');
        console.log('Status:', response.status);
        console.log('Data:', response.data);
        console.log('==============================');

        return response.data;
      } catch (err: unknown) {
        const error = err as { response?: { status?: number; statusText?: string; data?: unknown }; message?: string } | undefined;
        console.error('❌ ERRO BACKEND:', {
          status: error?.response?.status,
          statusText: error?.response?.statusText,
          data: error?.response?.data,
          message: error?.message,
        });
        throw err;
      }
    },
    ...options,
    onSuccess: (data, variables, context) => {
      // Invalidate specific keys or all queries
      if (invalidateKeys) {
        invalidateKeys.forEach(key => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      } else {
        queryClient.invalidateQueries();
      }

      if (options?.onSuccess) {
        options.onSuccess(data, variables, undefined, context as any);
      }
    }
  });
}

// Hook específico para UPDATE
export function useApiUpdate<TData, TVariables extends Record<string, unknown>>(
  url: string,
  invalidateKeys?: string[][],
  options?: UseMutationOptions<TData, ApiError, TVariables & { id: string | number }>
) {
  const queryClient = useQueryClient();

  return useMutation<TData, ApiError, TVariables & { id: string | number }>({
    mutationFn: async (variables: TVariables & { id: string | number }) => {
      const { id, ...data } = variables as any;

      // If caller passed FormData (or { formData }), handle multipart upload
      if (data instanceof FormData) {
        const response = await api.put(`${url}${id}/`, data);
        return response.data;
      }

      if (data && data.formData instanceof FormData) {
        const response = await api.put(`${url}${id}/`, data.formData);
        return response.data;
      }

      const response = await api.put(`${url}${id}/`, data);
      return response.data;
    },
    ...options,
    onSuccess: (data, variables, context) => {
      if (invalidateKeys) {
        invalidateKeys.forEach(key => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      } else {
        queryClient.invalidateQueries();
      }

      if (options?.onSuccess) {
        options.onSuccess(data, variables, undefined, context as any);
      }
    }
  });
}

// Hook específico para DELETE
export function useApiDelete(
  url: string,
  invalidateKeys?: string[][],
  options?: UseMutationOptions<void, ApiError, string | number>
) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string | number>({
    mutationFn: async (id: string | number) => {
      // Ensure ID is safely encoded in the URL. This avoids cases where
      // the frontend may pass a non-numeric id (or an object-like string)
      // that would create an invalid endpoint like `/areas/Object/`.
      const encodedId = encodeURIComponent(String(id));
      const fullUrl = `${url}${encodedId}/`;
      console.debug('[API] DELETE', fullUrl);
      try {
        await api.delete(fullUrl);
      } catch (err: unknown) {
        // Log helpful info for debugging and re-throw so callers can handle
        const e = err as any;
        console.error('[API] DELETE request failed', { url: fullUrl, status: e?.response?.status, data: e?.response?.data, message: e?.message });
        throw err;
      }
    },
    ...options,
    onSuccess: (data, variables, context) => {
      if (invalidateKeys) {
        invalidateKeys.forEach(key => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      } else {
        queryClient.invalidateQueries();
      }

      if (options?.onSuccess) {
        options.onSuccess(data, variables, undefined, context as any);
      }
    }
  });
}