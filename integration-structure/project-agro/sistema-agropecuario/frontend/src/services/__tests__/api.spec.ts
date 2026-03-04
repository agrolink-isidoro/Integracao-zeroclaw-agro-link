import api from '../api'

describe('api response handler', () => {
  beforeEach(() => {
    // reset global events
    (globalThis as any).window = (globalThis as any).window || {};
    (globalThis as any).window.__apiForbiddenEvents = [];
  })

  test('rejects 200-with-code-403 and records event', async () => {
    const mockResp: any = {
      config: { url: '/fazendas/test' },
      data: { code: 403, detail: 'Forbidden' },
      status: 200,
    }

    const targetApi = (api as any).__responseFulfilled ? api : (jest.requireActual('../api').default as any);
    const handlerObj = (targetApi as any).__responseFulfilled ? { fulfilled: (targetApi as any).__responseFulfilled } : (targetApi.interceptors.response as any).handlers.find((h: any) => typeof h.fulfilled === 'function');

    const handler = handlerObj.fulfilled.bind(handlerObj);
    expect(handler).toBeDefined();

    await expect(handler(mockResp)).rejects.toMatchObject({ response: { status: 403, data: { code: 403 } } });

    expect((window as any).__apiForbiddenEvents.length).toBeGreaterThan(0);
    const ev = (window as any).__apiForbiddenEvents[(window as any).__apiForbiddenEvents.length - 1];
    expect(ev.url).toBe('/fazendas/test');
    expect(ev.data.code).toBe(403);
  })

  test('normalizes paginated responses', async () => {
    const mockResp: any = {
      config: { url: '/fazendas/areas/' },
      data: { results: [{ id: 1 }], count: 1, next: null, previous: null },
      status: 200,
    }
    const targetApi = (api as any).__responseFulfilled ? api : (jest.requireActual('../api').default as any);
    const handlerObj = (targetApi as any).__responseFulfilled ? { fulfilled: (targetApi as any).__responseFulfilled } : (targetApi.interceptors.response as any).handlers.find((h: any) => typeof h.fulfilled === 'function');
    const handler = handlerObj.fulfilled.bind(handlerObj);

    const res = handler(mockResp);
    expect(res.data).toEqual([{ id: 1 }]);
    expect((res as any).meta).toMatchObject({ count: 1 });
  })
})
