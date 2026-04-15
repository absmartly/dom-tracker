import { errorTracker } from "../../trackers/error-tracking";
import { TrackerContext } from "../../core/types";

// jsdom does not implement PromiseRejectionEvent; use a plain Event with
// extra properties attached via Object.defineProperty.
function makeRejectionEvent(promise: Promise<unknown>, reason: unknown): Event {
  const evt = new Event("unhandledrejection", {
    bubbles: false,
    cancelable: true,
  });
  Object.defineProperty(evt, "promise", { value: promise });
  Object.defineProperty(evt, "reason", { value: reason });
  return evt;
}

function createMockContext(
  overrides?: Partial<TrackerContext>,
): TrackerContext {
  return {
    emit: jest.fn(),
    setAttributes: jest.fn(),
    getConfig: jest.fn(),
    querySelectorAll: jest.fn(),
    onElementAdded: jest.fn(),
    onElementRemoved: jest.fn(),
    getPageName: jest.fn().mockReturnValue("home"),
    ...overrides,
  };
}

describe("errorTracker", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("has correct name", () => {
    expect(errorTracker().name).toBe("error-tracker");
  });

  it("emits js_error on window error event", () => {
    const tracker = errorTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    const error = new Error("something went wrong");
    error.stack = "Error: something went wrong\n    at test.js:10:5";

    const event = new ErrorEvent("error", {
      message: "something went wrong",
      filename: "test.js",
      lineno: 10,
      colno: 5,
      error,
    });
    window.dispatchEvent(event);

    expect(ctx.emit).toHaveBeenCalledWith("js_error", {
      message: "something went wrong",
      filename: "test.js",
      lineno: 10,
      colno: 5,
      stack: "Error: something went wrong\n    at test.js:10:5",
      page_name: "home",
    });

    tracker.destroy();
  });

  it("truncates stack trace to 1000 chars", () => {
    const tracker = errorTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    const longStack = "x".repeat(2000);
    const error = new Error("overflow");
    error.stack = longStack;

    const event = new ErrorEvent("error", {
      message: "overflow",
      filename: "app.js",
      lineno: 1,
      colno: 1,
      error,
    });
    window.dispatchEvent(event);

    const emitCall = (ctx.emit as jest.Mock).mock.calls[0];
    expect(emitCall[1].stack.length).toBe(1000);

    tracker.destroy();
  });

  it("emits js_error on unhandled promise rejection with Error reason", () => {
    const tracker = errorTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    const reason = new Error("async failure");
    reason.stack = "Error: async failure\n    at promise.js:20:3";

    const promise = Promise.resolve(); // not actually rejected; event is synthetic
    const event = makeRejectionEvent(promise, reason);
    window.dispatchEvent(event);

    expect(ctx.emit).toHaveBeenCalledWith("js_error", {
      message: "async failure",
      filename: "",
      lineno: 0,
      colno: 0,
      stack: "Error: async failure\n    at promise.js:20:3",
      page_name: "home",
    });

    tracker.destroy();
  });

  it("handles string rejection reason", () => {
    const tracker = errorTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    const event = makeRejectionEvent(Promise.resolve(), "network error");
    window.dispatchEvent(event);

    expect(ctx.emit).toHaveBeenCalledWith("js_error", {
      message: "network error",
      filename: "",
      lineno: 0,
      colno: 0,
      stack: "",
      page_name: "home",
    });

    tracker.destroy();
  });

  it("dedupes identical errors within the dedupe window", () => {
    const tracker = errorTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    const error = new Error("dup error");
    error.stack = "stack";

    const makeEvent = () =>
      new ErrorEvent("error", {
        message: "dup error",
        filename: "app.js",
        lineno: 5,
        colno: 1,
        error,
      });

    window.dispatchEvent(makeEvent());
    window.dispatchEvent(makeEvent());

    expect(ctx.emit).toHaveBeenCalledTimes(1);

    tracker.destroy();
  });

  it("allows same error after dedupe window expires", () => {
    const tracker = errorTracker({ dedupeWindow: 5000 });
    const ctx = createMockContext();
    tracker.init(ctx);

    const error = new Error("repeat");
    error.stack = "stack";

    const makeEvent = () =>
      new ErrorEvent("error", {
        message: "repeat",
        filename: "app.js",
        lineno: 3,
        colno: 1,
        error,
      });

    window.dispatchEvent(makeEvent());
    expect(ctx.emit).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(5001);

    window.dispatchEvent(makeEvent());
    expect(ctx.emit).toHaveBeenCalledTimes(2);

    tracker.destroy();
  });

  it("respects maxErrors limit per page", () => {
    const tracker = errorTracker({ maxErrors: 3 });
    const ctx = createMockContext();
    tracker.init(ctx);

    for (let i = 0; i < 5; i++) {
      const error = new Error(`error ${i}`);
      error.stack = `stack ${i}`;
      const event = new ErrorEvent("error", {
        message: `error ${i}`,
        filename: "app.js",
        lineno: i,
        colno: 1,
        error,
      });
      window.dispatchEvent(event);
    }

    expect(ctx.emit).toHaveBeenCalledTimes(3);

    tracker.destroy();
  });

  it("resets error count on route change", () => {
    const tracker = errorTracker({ maxErrors: 2 });
    const ctx = createMockContext();
    tracker.init(ctx);

    for (let i = 0; i < 2; i++) {
      const error = new Error(`error ${i}`);
      error.stack = `stack ${i}`;
      const event = new ErrorEvent("error", {
        message: `error ${i}`,
        filename: "app.js",
        lineno: i,
        colno: 1,
        error,
      });
      window.dispatchEvent(event);
    }

    expect(ctx.emit).toHaveBeenCalledTimes(2);

    tracker.onRouteChange!("/new", "/old");
    (ctx.emit as jest.Mock).mockClear();

    for (let i = 0; i < 2; i++) {
      const error = new Error(`new error ${i}`);
      error.stack = `stack ${i}`;
      const event = new ErrorEvent("error", {
        message: `new error ${i}`,
        filename: "app.js",
        lineno: i,
        colno: 1,
        error,
      });
      window.dispatchEvent(event);
    }

    expect(ctx.emit).toHaveBeenCalledTimes(2);

    tracker.destroy();
  });

  it("removes both listeners on destroy", () => {
    const tracker = errorTracker();
    const ctx = createMockContext();
    tracker.init(ctx);
    tracker.destroy();

    // After destroy, dispatching error/unhandledrejection events should not
    // call emit since listeners were removed.
    const rejectionEvent = makeRejectionEvent(Promise.resolve(), "gone");
    window.dispatchEvent(rejectionEvent);

    expect(ctx.emit).not.toHaveBeenCalled();
  });

  it("handles error event without error object (e.error is undefined)", () => {
    const tracker = errorTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    const event = new ErrorEvent("error", {
      message: "script error",
      filename: "external.js",
      lineno: 0,
      colno: 0,
      error: undefined,
    });
    window.dispatchEvent(event);

    expect(ctx.emit).toHaveBeenCalledWith("js_error", {
      message: "script error",
      filename: "external.js",
      lineno: 0,
      colno: 0,
      stack: "",
      page_name: "home",
    });

    tracker.destroy();
  });

  it("handles null rejection reason", () => {
    const tracker = errorTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    const event = makeRejectionEvent(Promise.resolve(), null);
    window.dispatchEvent(event);

    expect(ctx.emit).toHaveBeenCalledWith("js_error", {
      message: "Unhandled rejection",
      filename: "",
      lineno: 0,
      colno: 0,
      stack: "",
      page_name: "home",
    });

    tracker.destroy();
  });

  it("handles undefined rejection reason", () => {
    const tracker = errorTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    const event = makeRejectionEvent(Promise.resolve(), undefined);
    window.dispatchEvent(event);

    expect(ctx.emit).toHaveBeenCalledWith("js_error", {
      message: "Unhandled rejection",
      filename: "",
      lineno: 0,
      colno: 0,
      stack: "",
      page_name: "home",
    });

    tracker.destroy();
  });

  it("uses 'Unknown error' when error event has no message", () => {
    const tracker = errorTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    const event = new ErrorEvent("error", {
      message: "",
      filename: "",
      lineno: 0,
      colno: 0,
    });
    window.dispatchEvent(event);

    expect(ctx.emit).toHaveBeenCalledWith(
      "js_error",
      expect.objectContaining({ message: "Unknown error" }),
    );

    tracker.destroy();
  });

  it("handles Error rejection reason with no stack", () => {
    const tracker = errorTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    const reason = new Error("no stack error");
    reason.stack = undefined as unknown as string;

    const event = makeRejectionEvent(Promise.resolve(), reason);
    window.dispatchEvent(event);

    expect(ctx.emit).toHaveBeenCalledWith("js_error", {
      message: "no stack error",
      filename: "",
      lineno: 0,
      colno: 0,
      stack: "",
      page_name: "home",
    });

    tracker.destroy();
  });

  it("clears dedupe timers on destroy", () => {
    const tracker = errorTracker({ dedupeWindow: 10000 });
    const ctx = createMockContext();
    tracker.init(ctx);

    const error = new Error("timer error");
    error.stack = "stack";
    const event = new ErrorEvent("error", {
      message: "timer error",
      filename: "app.js",
      lineno: 1,
      colno: 1,
      error,
    });
    window.dispatchEvent(event);

    // destroy should clear all pending timers without throwing
    expect(() => tracker.destroy()).not.toThrow();
  });
});
