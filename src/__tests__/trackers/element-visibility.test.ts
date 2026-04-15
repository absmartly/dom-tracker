import { elementVisibility } from "../../trackers/element-visibility";
import { TrackerContext } from "../../core/types";

function createMockContext(
  overrides?: Partial<TrackerContext>,
): TrackerContext {
  return {
    emit: jest.fn(),
    setAttributes: jest.fn(),
    getConfig: jest.fn(),
    querySelectorAll: jest.fn().mockReturnValue([]),
    onElementAdded: jest.fn(),
    onElementRemoved: jest.fn(),
    getPageName: jest.fn().mockReturnValue("home"),
    ...overrides,
  };
}

let observerCallback: IntersectionObserverCallback;
let observerInstance: {
  observe: jest.Mock;
  unobserve: jest.Mock;
  disconnect: jest.Mock;
};

beforeEach(() => {
  observerInstance = {
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  };
  (global as any).IntersectionObserver = jest.fn(
    (cb: IntersectionObserverCallback) => {
      observerCallback = cb;
      return observerInstance;
    },
  );
});

function triggerIntersection(
  entries: Partial<IntersectionObserverEntry>[],
): void {
  observerCallback(
    entries as IntersectionObserverEntry[],
    observerInstance as unknown as IntersectionObserver,
  );
}

describe("elementVisibility tracker", () => {
  it("has correct name", () => {
    expect(elementVisibility().name).toBe("element-visibility");
  });

  it("observes elements with data-abs-visible attribute on init", () => {
    const el = document.createElement("div");
    el.setAttribute("data-abs-visible", "hero_seen");
    document.body.appendChild(el);

    const tracker = elementVisibility();
    const ctx = createMockContext({
      querySelectorAll: jest.fn((selector: string) => {
        if (selector === "[data-abs-visible]") return [el];
        return [];
      }),
    });

    tracker.init(ctx);

    expect(observerInstance.observe).toHaveBeenCalledWith(el);

    tracker.destroy();
    document.body.removeChild(el);
  });

  it("emits element_visible when element becomes visible (isIntersecting: true)", () => {
    const el = document.createElement("div");
    el.setAttribute("data-abs-visible", "hero_seen");

    const tracker = elementVisibility();
    const ctx = createMockContext({
      querySelectorAll: jest.fn((selector: string) => {
        if (selector === "[data-abs-visible]") return [el];
        return [];
      }),
    });

    tracker.init(ctx);
    triggerIntersection([{ target: el, isIntersecting: true }]);

    expect(ctx.emit).toHaveBeenCalledWith("element_visible", {
      event_name: "hero_seen",
      page_name: "home",
    });

    tracker.destroy();
  });

  it("fires each element only once per page", () => {
    const el = document.createElement("div");
    el.setAttribute("data-abs-visible", "hero_seen");

    const tracker = elementVisibility();
    const ctx = createMockContext({
      querySelectorAll: jest.fn((selector: string) => {
        if (selector === "[data-abs-visible]") return [el];
        return [];
      }),
    });

    tracker.init(ctx);
    triggerIntersection([{ target: el, isIntersecting: true }]);
    triggerIntersection([{ target: el, isIntersecting: true }]);

    expect(ctx.emit).toHaveBeenCalledTimes(1);

    tracker.destroy();
  });

  it("ignores non-intersecting entries (isIntersecting: false)", () => {
    const el = document.createElement("div");
    el.setAttribute("data-abs-visible", "hero_seen");

    const tracker = elementVisibility();
    const ctx = createMockContext({
      querySelectorAll: jest.fn((selector: string) => {
        if (selector === "[data-abs-visible]") return [el];
        return [];
      }),
    });

    tracker.init(ctx);
    triggerIntersection([{ target: el, isIntersecting: false }]);

    expect(ctx.emit).not.toHaveBeenCalled();

    tracker.destroy();
  });

  it("observes elements matching CSS selector rules from config", () => {
    const el = document.createElement("section");
    el.className = "pricing";

    const tracker = elementVisibility({
      rules: [{ selector: ".pricing", event: "pricing_seen" }],
    });
    const ctx = createMockContext({
      querySelectorAll: jest.fn((selector: string) => {
        if (selector === ".pricing") return [el];
        return [];
      }),
    });

    tracker.init(ctx);

    expect(observerInstance.observe).toHaveBeenCalledWith(el);

    triggerIntersection([{ target: el, isIntersecting: true }]);

    expect(ctx.emit).toHaveBeenCalledWith("element_visible", {
      event_name: "pricing_seen",
      page_name: "home",
    });

    tracker.destroy();
  });

  it("includes data-abs-* props from attribute-tracked elements", () => {
    const el = document.createElement("div");
    el.setAttribute("data-abs-visible", "hero_seen");
    el.setAttribute("data-abs-campaign", "summer");

    const tracker = elementVisibility();
    const ctx = createMockContext({
      querySelectorAll: jest.fn((selector: string) => {
        if (selector === "[data-abs-visible]") return [el];
        return [];
      }),
    });

    tracker.init(ctx);
    triggerIntersection([{ target: el, isIntersecting: true }]);

    expect(ctx.emit).toHaveBeenCalledWith("element_visible", {
      event_name: "hero_seen",
      campaign: "summer",
      page_name: "home",
    });

    tracker.destroy();
  });

  it("resets fired set on route change (allows re-firing)", () => {
    const el = document.createElement("div");
    el.setAttribute("data-abs-visible", "hero_seen");

    const tracker = elementVisibility();
    const ctx = createMockContext({
      querySelectorAll: jest.fn((selector: string) => {
        if (selector === "[data-abs-visible]") return [el];
        return [];
      }),
    });

    tracker.init(ctx);
    triggerIntersection([{ target: el, isIntersecting: true }]);
    expect(ctx.emit).toHaveBeenCalledTimes(1);

    tracker.onRouteChange!("/new", "/old");
    (ctx.emit as jest.Mock).mockClear();

    triggerIntersection([{ target: el, isIntersecting: true }]);
    expect(ctx.emit).toHaveBeenCalledTimes(1);

    tracker.destroy();
  });

  it("disconnects observer on destroy", () => {
    const tracker = elementVisibility();
    const ctx = createMockContext();

    tracker.init(ctx);
    tracker.destroy();

    expect(observerInstance.disconnect).toHaveBeenCalled();
  });

  it("handles element with no event map entry gracefully (fallback event name)", () => {
    const el = document.createElement("div");

    const tracker = elementVisibility();
    const ctx = createMockContext();

    tracker.init(ctx);

    // Trigger intersection for an element that was never registered in elementEventMap
    triggerIntersection([{ target: el, isIntersecting: true }]);

    expect(ctx.emit).toHaveBeenCalledWith("element_visible", {
      event_name: "element_visible",
      page_name: "home",
    });

    tracker.destroy();
  });

  it("uses custom threshold when provided", () => {
    elementVisibility({ threshold: 0.8 });

    expect((global as any).IntersectionObserver).not.toHaveBeenCalled();

    const tracker = elementVisibility({ threshold: 0.8 });
    const ctx = createMockContext();
    tracker.init(ctx);

    expect((global as any).IntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      { threshold: 0.8 },
    );

    tracker.destroy();
  });

  it("does not observe an element twice if it matches both attribute and rule selector", () => {
    const el = document.createElement("div");
    el.setAttribute("data-abs-visible", "hero_seen");
    el.className = "hero";

    const tracker = elementVisibility({
      rules: [{ selector: ".hero", event: "hero_rule_seen" }],
    });
    const ctx = createMockContext({
      querySelectorAll: jest.fn((selector: string) => {
        if (selector === "[data-abs-visible]") return [el];
        if (selector === ".hero") return [el];
        return [];
      }),
    });

    tracker.init(ctx);

    // Element should only be observed once (attribute takes priority)
    expect(observerInstance.observe).toHaveBeenCalledTimes(1);

    tracker.destroy();
  });

  it("emits element_visible with fallback when mapping.props is empty (rule-based element)", () => {
    const el = document.createElement("div");
    el.className = "cta";

    const tracker = elementVisibility({
      rules: [{ selector: ".cta", event: "cta_seen" }],
    });
    const ctx = createMockContext({
      querySelectorAll: jest.fn((selector: string) => {
        if (selector === ".cta") return [el];
        return [];
      }),
    });

    tracker.init(ctx);
    triggerIntersection([{ target: el, isIntersecting: true }]);

    expect(ctx.emit).toHaveBeenCalledWith("element_visible", {
      event_name: "cta_seen",
      page_name: "home",
    });

    tracker.destroy();
  });

  it("uses 'element_visible' as fallback event name when data-abs-visible attribute is empty string", () => {
    const el = document.createElement("div");
    el.setAttribute("data-abs-visible", "");

    const tracker = elementVisibility();
    const ctx = createMockContext({
      querySelectorAll: jest.fn((selector: string) => {
        if (selector === "[data-abs-visible]") return [el];
        return [];
      }),
    });

    tracker.init(ctx);
    triggerIntersection([{ target: el, isIntersecting: true }]);

    expect(ctx.emit).toHaveBeenCalledWith("element_visible", {
      event_name: "element_visible",
      page_name: "home",
    });

    tracker.destroy();
  });
});
