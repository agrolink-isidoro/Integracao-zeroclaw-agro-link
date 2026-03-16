import { useMemo } from 'react';
import api from '../services/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
export default function useApi() {
    // return the configured axios instance; keep wrapper to follow hooks convention
    return useMemo(() => ({
        client: api,
        get: (url, config) => api.get(url, config),
        post: (url, data, config) => api.post(url, data, config),
        put: (url, data, config) => api.put(url, data, config),
        patch: (url, data, config) => api.patch(url, data, config),
        del: (url, config) => api.delete(url, config),
    }), []);
}
// Hook para queries GET
export function useApiQuery(key, url, options) {
    return useQuery({
        queryKey: key,
        queryFn: async () => {
            const response = await api.get(url);
            const data = response.data;
            // Normalize paginated responses: if backend returns {count, results, ...},
            // return the results array for components that expect an array.
            if (data && typeof data === 'object' && 'results' in data) {
                return data.results;
            }
            return data;
        },
        ...options
    });
}
// Hook para mutations (POST, PUT, DELETE)
export function useApiMutation(method, url, options) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (variables) => {
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
                options.onSuccess(data, variables, undefined, context);
            }
        }
    });
}
// Hook específico para CREATE
export function useApiCreate(url, invalidateKeys, options) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (variables) => {
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
                if (variables && variables.formData instanceof FormData) {
                    const response = await api.post(url, variables.formData);
                    return response.data;
                }
                const response = await api.post(url, variables);
                console.log('=== RESPONSE useApiCreate ===');
                console.log('Status:', response.status);
                console.log('Data:', response.data);
                console.log('==============================');
                return response.data;
            }
            catch (err) {
                const error = err;
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
            }
            else {
                queryClient.invalidateQueries();
            }
            if (options?.onSuccess) {
                options.onSuccess(data, variables, undefined, context);
            }
        }
    });
}
// Hook específico para UPDATE
export function useApiUpdate(url, invalidateKeys, options) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (variables) => {
            const { id, ...data } = variables;
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
            }
            else {
                queryClient.invalidateQueries();
            }
            if (options?.onSuccess) {
                options.onSuccess(data, variables, undefined, context);
            }
        }
    });
}
// Hook específico para DELETE
export function useApiDelete(url, invalidateKeys, options) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id) => {
            // Ensure ID is safely encoded in the URL. This avoids cases where
            // the frontend may pass a non-numeric id (or an object-like string)
            // that would create an invalid endpoint like `/areas/Object/`.
            const encodedId = encodeURIComponent(String(id));
            const fullUrl = `${url}${encodedId}/`;
            console.debug('[API] DELETE', fullUrl);
            try {
                await api.delete(fullUrl);
            }
            catch (err) {
                // Log helpful info for debugging and re-throw so callers can handle
                const e = err;
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
            }
            else {
                queryClient.invalidateQueries();
            }
            if (options?.onSuccess) {
                options.onSuccess(data, variables, undefined, context);
            }
        }
    });
}
