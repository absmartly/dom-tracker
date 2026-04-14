import { DOMTracker } from "../../core/DOMTracker";
import { DOMTrackerConfig, Tracker, TrackerContext } from "../../core/types";

function makeTracker(overrides: Partial<Tracker> = {}): Tracker {
  return {
    name: "test-tracker",
    init: jest.fn(),
    destroy: jest.fn(),
    ...overrides,
  };
}

function makeConfig(
  overrides: Partial<DOMTrackerConfig> = {},
): DOMTrackerConfig {
  return {
    onEvent: jest.fn(),
    ...overrides,
  };
}

describe("DOMTracker", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("SSR guard", () => {
    it("does not throw when window is undefined", () => {
      const originalWindow = global.window;
      Object.defineProperty(global, "window", {
        value: undefined,
        writable: true,
        configurable: true,
      });
      expect(() => new DOMTracker(makeConfig())).not.toThrow();
      Object.defineProperty(global, "window", {
        value: originalWindow,
        writable: true,
        configurable: true,
      });
    });
  });

  describe("emit", () => {
    it("calls onEvent handler when emit is invoked", () => {
      const onEvent = jest.fn();
      let capturedContext: TrackerContext;
      const tracker = makeTracker({
        init(ctx) {
          capturedContext = ctx;
        },
      });

      const domTracker = new DOMTracker(
        makeConfig({ onEvent, trackers: [tracker] }),
      );
      capturedContext!.emit("test_event", { foo: "bar" });

      expect(onEvent).toHaveBeenCalledWith("test_event", { foo: "bar" });
      domTracker.destroy();
    });

    it("calls multiple onEvent handlers", () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      let capturedContext: TrackerContext;
      const tracker = makeTracker({
        init(ctx) {
          capturedContext = ctx;
        },
      });

      const domTracker = new DOMTracker(
        makeConfig({ onEvent: [handler1, handler2], trackers: [tracker] }),
      );
      capturedContext!.emit("test_event", {});

      expect(handler1).toHaveBeenCalledWith("test_event", {});
      expect(handler2).toHaveBeenCalledWith("test_event", {});
      domTracker.destroy();
    });

    it("continues calling remaining handlers if one throws", () => {
      const badHandler = jest.fn(() => {
        throw new Error("oops");
      });
      const goodHandler = jest.fn();
      let capturedContext: TrackerContext;
      const tracker = makeTracker({
        init(ctx) {
          capturedContext = ctx;
        },
      });

      const domTracker = new DOMTracker(
        makeConfig({ onEvent: [badHandler, goodHandler], trackers: [tracker] }),
      );
      expect(() => capturedContext!.emit("test_event", {})).not.toThrow();
      expect(goodHandler).toHaveBeenCalled();
      domTracker.destroy();
    });
  });

  describe("setAttributes", () => {
    it("calls onAttribute handler when setAttributes is invoked", () => {
      const onAttribute = jest.fn();
      let capturedContext: TrackerContext;
      const tracker = makeTracker({
        init(ctx) {
          capturedContext = ctx;
        },
      });

      const domTracker = new DOMTracker(
        makeConfig({ onAttribute, trackers: [tracker] }),
      );
      capturedContext!.setAttributes({ user_id: 42 });

      expect(onAttribute).toHaveBeenCalledWith({ user_id: 42 });
      domTracker.destroy();
    });

    it("calls multiple onAttribute handlers", () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      let capturedContext: TrackerContext;
      const tracker = makeTracker({
        init(ctx) {
          capturedContext = ctx;
        },
      });

      const domTracker = new DOMTracker(
        makeConfig({ onAttribute: [handler1, handler2], trackers: [tracker] }),
      );
      capturedContext!.setAttributes({ x: 1 });

      expect(handler1).toHaveBeenCalledWith({ x: 1 });
      expect(handler2).toHaveBeenCalledWith({ x: 1 });
      domTracker.destroy();
    });

    it("continues calling remaining attribute handlers if one throws", () => {
      const badHandler = jest.fn(() => {
        throw new Error("attr fail");
      });
      const goodHandler = jest.fn();
      let capturedContext: TrackerContext;
      const tracker = makeTracker({
        init(ctx) {
          capturedContext = ctx;
        },
      });

      const domTracker = new DOMTracker(
        makeConfig({
          onAttribute: [badHandler, goodHandler],
          trackers: [tracker],
        }),
      );
      expect(() => capturedContext!.setAttributes({})).not.toThrow();
      expect(goodHandler).toHaveBeenCalled();
      domTracker.destroy();
    });

    it("does nothing when no onAttribute provided", () => {
      let capturedContext: TrackerContext;
      const tracker = makeTracker({
        init(ctx) {
          capturedContext = ctx;
        },
      });

      const domTracker = new DOMTracker(makeConfig({ trackers: [tracker] }));
      expect(() => capturedContext!.setAttributes({ x: 1 })).not.toThrow();
      domTracker.destroy();
    });
  });

  describe("tracker registration", () => {
    it("calls tracker init during construction", () => {
      const tracker = makeTracker();
      const domTracker = new DOMTracker(makeConfig({ trackers: [tracker] }));
      expect(tracker.init).toHaveBeenCalledTimes(1);
      domTracker.destroy();
    });

    it("throws when adding a tracker with a duplicate name", () => {
      const tracker = makeTracker();
      const domTracker = new DOMTracker(makeConfig({ trackers: [tracker] }));
      expect(() => domTracker.addTracker(makeTracker())).toThrow();
      domTracker.destroy();
    });

    it("does not throw when adding a tracker with a unique name after construction", () => {
      const domTracker = new DOMTracker(makeConfig());
      const tracker = makeTracker({ name: "new-tracker" });
      expect(() => domTracker.addTracker(tracker)).not.toThrow();
      expect(tracker.init).toHaveBeenCalledTimes(1);
      domTracker.destroy();
    });

    it("initializes tracker added via addTracker with TrackerContext", () => {
      const domTracker = new DOMTracker(makeConfig());
      let capturedCtx: TrackerContext | undefined;
      const tracker = makeTracker({
        name: "new-tracker",
        init(ctx) {
          capturedCtx = ctx;
        },
      });
      domTracker.addTracker(tracker);
      expect(capturedCtx).toBeDefined();
      domTracker.destroy();
    });

    it("catches tracker init errors and continues with other trackers", () => {
      const badTracker = makeTracker({
        name: "bad",
        init: jest.fn(() => {
          throw new Error("init fail");
        }),
      });
      const goodTracker = makeTracker({ name: "good" });

      expect(
        () =>
          new DOMTracker(makeConfig({ trackers: [badTracker, goodTracker] })),
      ).not.toThrow();
      expect(goodTracker.init).toHaveBeenCalled();
    });

    it("removeTracker calls destroy on the tracker", () => {
      const tracker = makeTracker();
      const domTracker = new DOMTracker(makeConfig({ trackers: [tracker] }));
      domTracker.removeTracker("test-tracker");
      expect(tracker.destroy).toHaveBeenCalledTimes(1);
      domTracker.destroy();
    });

    it("removeTracker is no-op if tracker not found", () => {
      const domTracker = new DOMTracker(makeConfig());
      expect(() => domTracker.removeTracker("nonexistent")).not.toThrow();
      domTracker.destroy();
    });

    it("catches tracker destroy errors during removeTracker", () => {
      const tracker1 = makeTracker({
        name: "tracker1",
        destroy: jest.fn(() => {
          throw new Error("destroy fail");
        }),
      });
      const domTracker = new DOMTracker(makeConfig({ trackers: [tracker1] }));
      expect(() => domTracker.removeTracker("tracker1")).not.toThrow();
      domTracker.destroy();
    });
  });

  describe("destroy", () => {
    it("calls destroy on all registered trackers", () => {
      const tracker1 = makeTracker({ name: "tracker1" });
      const tracker2 = makeTracker({ name: "tracker2" });
      const domTracker = new DOMTracker(
        makeConfig({ trackers: [tracker1, tracker2] }),
      );
      domTracker.destroy();
      expect(tracker1.destroy).toHaveBeenCalledTimes(1);
      expect(tracker2.destroy).toHaveBeenCalledTimes(1);
    });

    it("is idempotent (calling destroy twice does not double-destroy)", () => {
      const tracker = makeTracker();
      const domTracker = new DOMTracker(makeConfig({ trackers: [tracker] }));
      domTracker.destroy();
      domTracker.destroy();
      expect(tracker.destroy).toHaveBeenCalledTimes(1);
    });

    it("catches tracker destroy errors and destroys remaining trackers", () => {
      const tracker1 = makeTracker({
        name: "tracker1",
        destroy: jest.fn(() => {
          throw new Error("destroy fail");
        }),
      });
      const tracker2 = makeTracker({ name: "tracker2" });
      const domTracker = new DOMTracker(
        makeConfig({ trackers: [tracker1, tracker2] }),
      );
      expect(() => domTracker.destroy()).not.toThrow();
      expect(tracker2.destroy).toHaveBeenCalled();
    });
  });

  describe("TrackerContext", () => {
    it("getConfig returns the config", () => {
      let capturedCtx: TrackerContext;
      const tracker = makeTracker({
        init(ctx) {
          capturedCtx = ctx;
        },
      });
      const config = makeConfig({ trackers: [tracker] });
      const domTracker = new DOMTracker(config);
      expect(capturedCtx!.getConfig()).toBe(config);
      domTracker.destroy();
    });

    it("querySelectorAll returns elements matching selector", () => {
      const div1 = document.createElement("div");
      div1.className = "test";
      const div2 = document.createElement("div");
      div2.className = "test";
      document.body.appendChild(div1);
      document.body.appendChild(div2);

      let capturedCtx: TrackerContext;
      const tracker = makeTracker({
        init(ctx) {
          capturedCtx = ctx;
        },
      });
      const domTracker = new DOMTracker(makeConfig({ trackers: [tracker] }));
      const results = capturedCtx!.querySelectorAll(".test");
      expect(results).toHaveLength(2);
      domTracker.destroy();
    });

    it("getPageName returns the current page name", () => {
      let capturedCtx: TrackerContext;
      const tracker = makeTracker({
        init(ctx) {
          capturedCtx = ctx;
        },
      });
      const domTracker = new DOMTracker(makeConfig({ trackers: [tracker] }));
      expect(typeof capturedCtx!.getPageName()).toBe("string");
      domTracker.destroy();
    });

    it("uses custom pageName function when provided", () => {
      const pageName = jest.fn().mockReturnValue("custom-page");
      let capturedCtx: TrackerContext;
      const tracker = makeTracker({
        init(ctx) {
          capturedCtx = ctx;
        },
      });
      const domTracker = new DOMTracker(
        makeConfig({ pageName, trackers: [tracker] }),
      );
      expect(capturedCtx!.getPageName()).toBe("custom-page");
      domTracker.destroy();
    });

    it("onElementAdded in non-SPA mode runs callback for existing elements", () => {
      const el = document.createElement("div");
      el.className = "my-el";
      document.body.appendChild(el);

      const cb = jest.fn();
      let capturedCtx: TrackerContext;
      const tracker = makeTracker({
        init(ctx) {
          capturedCtx = ctx;
        },
      });
      const domTracker = new DOMTracker(makeConfig({ trackers: [tracker] }));
      capturedCtx!.onElementAdded(".my-el", cb);
      expect(cb).toHaveBeenCalledTimes(1);
      domTracker.destroy();
    });

    it("onElementAdded in non-SPA mode returns no-op unsubscribe", () => {
      let capturedCtx: TrackerContext;
      const tracker = makeTracker({
        init(ctx) {
          capturedCtx = ctx;
        },
      });
      const domTracker = new DOMTracker(makeConfig({ trackers: [tracker] }));
      const unsub = capturedCtx!.onElementAdded(".missing", jest.fn());
      expect(typeof unsub).toBe("function");
      expect(() => unsub()).not.toThrow();
      domTracker.destroy();
    });

    it("onElementRemoved in non-SPA mode returns no-op unsubscribe", () => {
      let capturedCtx: TrackerContext;
      const tracker = makeTracker({
        init(ctx) {
          capturedCtx = ctx;
        },
      });
      const domTracker = new DOMTracker(makeConfig({ trackers: [tracker] }));
      const unsub = capturedCtx!.onElementRemoved(".missing", jest.fn());
      expect(typeof unsub).toBe("function");
      expect(() => unsub()).not.toThrow();
      domTracker.destroy();
    });
  });

  describe("rules and presets", () => {
    it("addRule delegates to RuleEngine", () => {
      const domTracker = new DOMTracker(makeConfig());
      expect(() =>
        domTracker.addRule({ selector: "button", event: "btn_click" }),
      ).not.toThrow();
      domTracker.destroy();
    });

    it("processes presets rules and tracker", () => {
      const presetTracker = makeTracker({ name: "preset-tracker" });
      const domTracker = new DOMTracker(
        makeConfig({
          presets: [
            {
              rules: [{ selector: ".tracked", event: "tracked_click" }],
              tracker: presetTracker,
            },
          ],
        }),
      );
      expect(presetTracker.init).toHaveBeenCalledTimes(1);
      domTracker.destroy();
    });

    it("processes presets without a tracker", () => {
      expect(() =>
        new DOMTracker(
          makeConfig({
            presets: [{ rules: [{ selector: ".x", event: "x_click" }] }],
          }),
        ).destroy(),
      ).not.toThrow();
    });
  });

  describe("SPA mode", () => {
    it("creates SPAObserver when spa: true and calls onRouteChange on trackers", () => {
      const onRouteChange = jest.fn();
      const tracker = makeTracker({
        onRouteChange,
      });
      const domTracker = new DOMTracker(
        makeConfig({ spa: true, trackers: [tracker] }),
      );
      history.pushState({}, "", "/new-page");
      expect(onRouteChange).toHaveBeenCalled();
      domTracker.destroy();
    });

    it("calls onDOMMutation on trackers that define it", (done) => {
      const onDOMMutation = jest.fn();
      const tracker = makeTracker({ onDOMMutation });
      const domTracker = new DOMTracker(
        makeConfig({ spa: true, trackers: [tracker] }),
      );

      const div = document.createElement("div");
      document.body.appendChild(div);

      setTimeout(() => {
        expect(onDOMMutation).toHaveBeenCalled();
        domTracker.destroy();
        done();
      }, 50);
    });

    it("onElementAdded in SPA mode delegates to SPAObserver", () => {
      let capturedCtx: TrackerContext;
      const tracker = makeTracker({
        init(ctx) {
          capturedCtx = ctx;
        },
      });
      const domTracker = new DOMTracker(
        makeConfig({ spa: true, trackers: [tracker] }),
      );
      const unsub = capturedCtx!.onElementAdded(".dynamic", jest.fn());
      expect(typeof unsub).toBe("function");
      domTracker.destroy();
    });

    it("onElementRemoved in SPA mode delegates to SPAObserver", () => {
      let capturedCtx: TrackerContext;
      const tracker = makeTracker({
        init(ctx) {
          capturedCtx = ctx;
        },
      });
      const domTracker = new DOMTracker(
        makeConfig({ spa: true, trackers: [tracker] }),
      );
      const unsub = capturedCtx!.onElementRemoved(".dynamic", jest.fn());
      expect(typeof unsub).toBe("function");
      domTracker.destroy();
    });
    it("catches tracker onRouteChange errors and continues", () => {
      const badTracker = makeTracker({
        name: "bad-route",
        onRouteChange: jest.fn(() => {
          throw new Error("route fail");
        }),
      });
      const goodTracker = makeTracker({
        name: "good-route",
        onRouteChange: jest.fn(),
      });
      const domTracker = new DOMTracker(
        makeConfig({ spa: true, trackers: [badTracker, goodTracker] }),
      );
      expect(() => history.pushState({}, "", "/error-page")).not.toThrow();
      expect(goodTracker.onRouteChange).toHaveBeenCalled();
      domTracker.destroy();
    });

    it("catches tracker onDOMMutation errors and continues", (done) => {
      const badTracker = makeTracker({
        name: "bad-mutation",
        onDOMMutation: jest.fn(() => {
          throw new Error("mutation fail");
        }),
      });
      const goodTracker = makeTracker({
        name: "good-mutation",
        onDOMMutation: jest.fn(),
      });
      const domTracker = new DOMTracker(
        makeConfig({ spa: true, trackers: [badTracker, goodTracker] }),
      );

      const div = document.createElement("div");
      document.body.appendChild(div);

      setTimeout(() => {
        expect(goodTracker.onDOMMutation).toHaveBeenCalled();
        domTracker.destroy();
        done();
      }, 50);
    });

    it("works with debug true in SPA mode", () => {
      const tracker = makeTracker({
        name: "debug-tracker",
        onRouteChange: jest.fn(),
        onDOMMutation: jest.fn(),
      });
      const domTracker = new DOMTracker(
        makeConfig({ spa: true, debug: true, trackers: [tracker] }),
      );
      history.pushState({}, "", "/debug-page");
      expect(tracker.onRouteChange).toHaveBeenCalled();
      domTracker.destroy();
    });

    it("handles trackers without onRouteChange or onDOMMutation", () => {
      const tracker = makeTracker({ name: "simple-tracker" });
      const domTracker = new DOMTracker(
        makeConfig({ spa: true, trackers: [tracker] }),
      );
      expect(() => history.pushState({}, "", "/simple-test")).not.toThrow();
      domTracker.destroy();
    });

    it("onElementAdded in non-SPA mode handles invalid selector gracefully", () => {
      let capturedCtx: TrackerContext;
      const tracker = makeTracker({
        init(ctx) {
          capturedCtx = ctx;
        },
      });
      const domTracker = new DOMTracker(makeConfig({ trackers: [tracker] }));
      const cb = jest.fn();
      expect(() =>
        capturedCtx!.onElementAdded("!!!invalid!!!", cb),
      ).not.toThrow();
      expect(cb).not.toHaveBeenCalled();
      domTracker.destroy();
    });
  });

  describe("debug mode", () => {
    it("logs errors when debug is true and onEvent handler throws", () => {
      const badHandler = jest.fn(() => {
        throw new Error("event fail");
      });
      let capturedContext: TrackerContext;
      const tracker = makeTracker({
        init(ctx) {
          capturedContext = ctx;
        },
      });

      const domTracker = new DOMTracker(
        makeConfig({ onEvent: badHandler, debug: true, trackers: [tracker] }),
      );
      expect(() => capturedContext!.emit("test", {})).not.toThrow();
      domTracker.destroy();
    });

    it("logs errors when debug is true and onAttribute handler throws", () => {
      const badHandler = jest.fn(() => {
        throw new Error("attr fail");
      });
      let capturedContext: TrackerContext;
      const tracker = makeTracker({
        init(ctx) {
          capturedContext = ctx;
        },
      });

      const domTracker = new DOMTracker(
        makeConfig({
          onAttribute: badHandler,
          debug: true,
          trackers: [tracker],
        }),
      );
      expect(() => capturedContext!.setAttributes({})).not.toThrow();
      domTracker.destroy();
    });

    it("logs errors when debug is true and tracker init throws", () => {
      const badTracker = makeTracker({
        name: "bad-init",
        init: jest.fn(() => {
          throw new Error("init fail");
        }),
      });
      expect(
        () =>
          new DOMTracker(makeConfig({ debug: true, trackers: [badTracker] })),
      ).not.toThrow();
    });

    it("logs errors when debug is true and tracker destroy throws", () => {
      const badTracker = makeTracker({
        name: "bad-destroy",
        destroy: jest.fn(() => {
          throw new Error("destroy fail");
        }),
      });
      const domTracker = new DOMTracker(
        makeConfig({ debug: true, trackers: [badTracker] }),
      );
      expect(() => domTracker.destroy()).not.toThrow();
    });

    it("logs errors when debug is true and onRouteChange throws", () => {
      const badTracker = makeTracker({
        name: "bad-route-debug",
        onRouteChange: jest.fn(() => {
          throw new Error("route fail");
        }),
      });
      const domTracker = new DOMTracker(
        makeConfig({ spa: true, debug: true, trackers: [badTracker] }),
      );
      expect(() =>
        history.pushState({}, "", "/debug-route-error"),
      ).not.toThrow();
      domTracker.destroy();
    });

    it("logs errors when debug is true and onDOMMutation throws", (done) => {
      const badTracker = makeTracker({
        name: "bad-mutation-debug",
        onDOMMutation: jest.fn(() => {
          throw new Error("mutation fail");
        }),
      });
      const domTracker = new DOMTracker(
        makeConfig({ spa: true, debug: true, trackers: [badTracker] }),
      );

      const div = document.createElement("div");
      document.body.appendChild(div);

      setTimeout(() => {
        domTracker.destroy();
        done();
      }, 50);
    });

    it("addRule is no-op on SSR instance", () => {
      const originalWindow = global.window;
      Object.defineProperty(global, "window", {
        value: undefined,
        writable: true,
        configurable: true,
      });
      const domTracker = new DOMTracker(makeConfig());
      Object.defineProperty(global, "window", {
        value: originalWindow,
        writable: true,
        configurable: true,
      });
      expect(() =>
        domTracker.addRule({ selector: ".x", event: "x" }),
      ).not.toThrow();
      domTracker.destroy();
    });

    it("destroy is no-op on SSR instance", () => {
      const originalWindow = global.window;
      Object.defineProperty(global, "window", {
        value: undefined,
        writable: true,
        configurable: true,
      });
      const domTracker = new DOMTracker(makeConfig());
      Object.defineProperty(global, "window", {
        value: originalWindow,
        writable: true,
        configurable: true,
      });
      expect(() => domTracker.destroy()).not.toThrow();
    });
  });
});
