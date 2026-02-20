import "@testing-library/jest-dom";

if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  });

  class IntersectionObserver {
    root = null;
    rootMargin = "";
    thresholds: number[] = [];
    disconnect() {}
    observe() {}
    takeRecords() { return []; }
    unobserve() {}
  }
  Object.defineProperty(window, "IntersectionObserver", {
    writable: true,
    configurable: true,
    value: IntersectionObserver,
  });
  Object.defineProperty(global, "IntersectionObserver", {
    writable: true,
    configurable: true,
    value: IntersectionObserver,
  });
}
