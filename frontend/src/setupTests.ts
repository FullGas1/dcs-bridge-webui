import '@testing-library/jest-dom/vitest';

// jsdom has no ResizeObserver; CodeMirror's scroller uses one.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;
