import "@testing-library/jest-dom/vitest";

// Desktop table uses `hidden md:block`. Default jsdom is treated as mobile unless
// we mock matchMedia to match Tailwind's md breakpoint (768px).
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: query.includes("min-width"),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
