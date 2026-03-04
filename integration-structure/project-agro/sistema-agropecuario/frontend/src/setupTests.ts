import React from 'react';
import '@testing-library/jest-dom';

// A small interface for polyfills we add to globalThis in tests
type GlobalPolyfills = {
  TextEncoder?: { new (): { encode(input: string): Uint8Array } };
  alert?: (msg?: string) => void;
  confirm?: (msg?: string) => boolean;
};

// Minimal TextEncoder polyfill for jsdom/testing environment
if (typeof (globalThis as unknown as GlobalPolyfills).TextEncoder === 'undefined') {
  (globalThis as unknown as GlobalPolyfills).TextEncoder = class {
    encode(str: string) {
      const s = String(str);
      const encoded = encodeURIComponent(s);
      const bytes: number[] = [];
      for (let i = 0; i < encoded.length; i++) {
        bytes.push(encoded.charCodeAt(i));
      }
      return new Uint8Array(bytes);
    }
  } as GlobalPolyfills['TextEncoder'];
}

// Provide safe global stubs for browser functions not implemented in jsdom
if (typeof (globalThis as unknown as GlobalPolyfills).alert === 'undefined') {
  (globalThis as unknown as GlobalPolyfills).alert = jest.fn();
}
if (typeof (globalThis as unknown as GlobalPolyfills).confirm === 'undefined') {
  (globalThis as unknown as GlobalPolyfills).confirm = jest.fn(() => true);
}

// Polyfill HTMLCanvasElement.getContext to avoid Chart.js errors in jsdom
// Chart.js attempts to acquire a 2D drawing context; jsdom doesn't implement it by default.
// Provide a minimal stub that exposes commonly used methods so charts can render during tests.
// Override canvas getContext for tests to avoid Chart.js errors (jsdom provides a non-functional stub)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - augmenting prototype for test environment
HTMLCanvasElement.prototype.getContext = function () {
  const ctx: any = {
    fillRect: () => {},
    clearRect: () => {},
    getImageData: (_: number, __: number, w: number, h: number) => ({ data: new Array(w * h * 4) }),
    putImageData: () => {},
    createImageData: () => [],
    setTransform: () => {},
    drawImage: () => {},
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    fill: () => {},
    measureText: () => ({ width: 0 }),
    transform: () => {},
    rotate: () => {},
    translate: () => {},
    scale: () => {},
    fillText: () => {},
  };
  // Attach a reference to the canvas to match Chart.js expectations
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  ctx.canvas = this;
  return ctx;
};

// Provide simple mocks for react-chartjs-2 so Chart rendering doesn't require a real canvas
// Tests can still assert that 'pie-chart' and 'bar-chart' are present when appropriate
jest.mock('react-chartjs-2', () => ({
  Pie: () => React.createElement('div', { 'data-testid': 'pie-chart' }),
  Bar: () => React.createElement('div', { 'data-testid': 'bar-chart' }),
  Line: () => React.createElement('div', { 'data-testid': 'line-chart' }),
  Doughnut: () => React.createElement('div', { 'data-testid': 'doughnut-chart' }),
}));
