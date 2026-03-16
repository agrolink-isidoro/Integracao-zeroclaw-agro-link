import api from '../api';
describe('api response normalizer', () => {
    it('normalizes paginated DRF response to array', () => {
        // In tests we have a default mock for the API; prefer the real implementation when testing interceptor behavior
        const targetApi = api.__responseFulfilled ? api : jest.requireActual('../api').default;
        const handler = targetApi.__responseFulfilled ? { fulfilled: targetApi.__responseFulfilled } : targetApi.interceptors.response.handlers.find((h) => typeof h.fulfilled === 'function');
        const paginatedResp = { data: { count: 1, next: null, previous: null, results: [{ id: 1, name: 'X' }] } };
        const result = handler.fulfilled(paginatedResp);
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data).toEqual([{ id: 1, name: 'X' }]);
        // meta should be available as non-enumerable property
        expect(result.meta).toEqual({ count: 1, next: null, previous: null });
    });
    it('keeps non-paginated response as-is', () => {
        const targetApi = api.__responseFulfilled ? api : jest.requireActual('../api').default;
        const handler = targetApi.__responseFulfilled ? { fulfilled: targetApi.__responseFulfilled } : targetApi.interceptors.response.handlers.find((h) => typeof h.fulfilled === 'function');
        const plainResp = { data: [{ id: 2, name: 'Y' }] };
        const result = handler.fulfilled(plainResp);
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data).toEqual([{ id: 2, name: 'Y' }]);
    });
    it('rejects response when backend returns code 403 in payload', async () => {
        const targetApi = api.__responseFulfilled ? api : jest.requireActual('../api').default;
        const handler = targetApi.__responseFulfilled ? { fulfilled: targetApi.__responseFulfilled } : targetApi.interceptors.response.handlers.find((h) => typeof h.fulfilled === 'function');
        const forbiddenResp = { data: { code: 403, detail: 'Forbidden' } };
        await expect(handler.fulfilled(forbiddenResp)).rejects.toThrow('Forbidden');
    });
});
