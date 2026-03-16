import React from 'react';
import '@testing-library/jest-dom';
// Minimal TextEncoder polyfill for jsdom/testing environment
if (typeof globalThis.TextEncoder === 'undefined') {
    globalThis.TextEncoder = class {
        encode(str) {
            const s = String(str);
            const encoded = encodeURIComponent(s);
            const bytes = [];
            for (let i = 0; i < encoded.length; i++) {
                bytes.push(encoded.charCodeAt(i));
            }
            return new Uint8Array(bytes);
        }
    };
}
// Provide safe global stubs for browser functions not implemented in jsdom
if (typeof globalThis.alert === 'undefined') {
    globalThis.alert = jest.fn();
}
if (typeof globalThis.confirm === 'undefined') {
    globalThis.confirm = jest.fn(() => true);
}
// Polyfill HTMLCanvasElement.getContext to avoid Chart.js errors in jsdom
// Chart.js attempts to acquire a 2D drawing context; jsdom doesn't implement it by default.
// Provide a minimal stub that exposes commonly used methods so charts can render during tests.
// Override canvas getContext for tests to avoid Chart.js errors (jsdom provides a non-functional stub)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - augmenting prototype for test environment
HTMLCanvasElement.prototype.getContext = function () {
    const ctx = {
        fillRect: () => { },
        clearRect: () => { },
        getImageData: (_, __, w, h) => ({ data: new Array(w * h * 4) }),
        putImageData: () => { },
        createImageData: () => [],
        setTransform: () => { },
        drawImage: () => { },
        save: () => { },
        restore: () => { },
        beginPath: () => { },
        moveTo: () => { },
        lineTo: () => { },
        closePath: () => { },
        stroke: () => { },
        fill: () => { },
        measureText: () => ({ width: 0 }),
        transform: () => { },
        rotate: () => { },
        translate: () => { },
        scale: () => { },
        fillText: () => { },
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
