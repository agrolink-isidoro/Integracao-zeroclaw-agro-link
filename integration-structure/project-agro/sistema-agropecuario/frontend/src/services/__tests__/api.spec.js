import api from '../api';
describe('api response handler', () => {
    beforeEach(() => {
        // reset global events
        globalThis.window = globalThis.window || {};
        globalThis.window.__apiForbiddenEvents = [];
    });
    test('rejects 200-with-code-403 and records event', async () => {
        const mockResp = {
            config: { url: '/fazendas/test' },
            data: { code: 403, detail: 'Forbidden' },
            status: 200,
        };
        const targetApi = api.__responseFulfilled ? api : jest.requireActual('../api').default;
        const handlerObj = targetApi.__responseFulfilled ? { fulfilled: targetApi.__responseFulfilled } : targetApi.interceptors.response.handlers.find((h) => typeof h.fulfilled === 'function');
        const handler = handlerObj.fulfilled.bind(handlerObj);
        expect(handler).toBeDefined();
        await expect(handler(mockResp)).rejects.toMatchObject({ response: { status: 403, data: { code: 403 } } });
        expect(window.__apiForbiddenEvents.length).toBeGreaterThan(0);
        const ev = window.__apiForbiddenEvents[window.__apiForbiddenEvents.length - 1];
        expect(ev.url).toBe('/fazendas/test');
        expect(ev.data.code).toBe(403);
    });
    test('normalizes paginated responses', async () => {
        const mockResp = {
            config: { url: '/fazendas/areas/' },
            data: { results: [{ id: 1 }], count: 1, next: null, previous: null },
            status: 200,
        };
        const targetApi = api.__responseFulfilled ? api : jest.requireActual('../api').default;
        const handlerObj = targetApi.__responseFulfilled ? { fulfilled: targetApi.__responseFulfilled } : targetApi.interceptors.response.handlers.find((h) => typeof h.fulfilled === 'function');
        const handler = handlerObj.fulfilled.bind(handlerObj);
        const res = handler(mockResp);
        expect(res.data).toEqual([{ id: 1 }]);
        expect(res.meta).toMatchObject({ count: 1 });
    });
});
