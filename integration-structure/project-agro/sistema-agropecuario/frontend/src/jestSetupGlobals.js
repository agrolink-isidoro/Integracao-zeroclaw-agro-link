// Run before tests to provide safe globals and default mocks
// Define browser alert/confirm to avoid jsdom "Not implemented" errors
globalThis.alert = globalThis.alert || (() => {});
globalThis.confirm = globalThis.confirm || (() => true);

// Provide a default mock for the API module so tests that don't explicitly mock it
// won't trigger network requests at import-time or first render.
jest.mock('@/services/api', () => ({
  get: jest.fn().mockResolvedValue({ data: [] }),
  post: jest.fn().mockResolvedValue({ data: {} }),
  put: jest.fn().mockResolvedValue({ data: {} }),
  patch: jest.fn().mockResolvedValue({ data: {} }),
  delete: jest.fn().mockResolvedValue({ data: {} }),
}));
