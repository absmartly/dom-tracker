import type { DOMTrackerConfig } from "../../core/types";

describe("core types", () => {
  it("should allow valid DOMTrackerConfig with single handler", () => {
    const config: DOMTrackerConfig = {
      onEvent: (_event: string, _props: Record<string, unknown>) => {},
    };
    expect(config.onEvent).toBeDefined();
  });

  it("should allow valid DOMTrackerConfig with array of handlers", () => {
    const config: DOMTrackerConfig = {
      onEvent: [
        (_event: string, _props: Record<string, unknown>) => {},
        (_event: string, _props: Record<string, unknown>) => {},
      ],
    };
    expect(Array.isArray(config.onEvent)).toBe(true);
  });
});
