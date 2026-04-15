import { rageClicks } from "../../trackers/rage-clicks";
import { TrackerContext } from "../../core/types";

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

function fireClick(target: Element): void {
  const event = new MouseEvent("click", { bubbles: true });
  Object.defineProperty(event, "target", { value: target, writable: false });
  document.dispatchEvent(event);
}

describe("rageClicks tracker", () => {
  let now: number;

  beforeEach(() => {
    jest.useFakeTimers();
    now = 1000;
    jest.setSystemTime(now);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("has correct name", () => {
    expect(rageClicks().name).toBe("rage-clicks");
  });

  it("emits rage_click after 3 rapid clicks on the same element", () => {
    const tracker = rageClicks();
    const ctx = createMockContext();
    tracker.init(ctx);

    const el = document.createElement("button");
    el.textContent = "Click me";

    fireClick(el);
    fireClick(el);
    fireClick(el);

    expect(ctx.emit).toHaveBeenCalledWith("rage_click", {
      element_tag: "BUTTON",
      element_text: "Click me",
      click_count: 3,
      page_name: "home",
    });

    tracker.destroy();
  });

  it("does NOT emit for only 2 clicks", () => {
    const tracker = rageClicks();
    const ctx = createMockContext();
    tracker.init(ctx);

    const el = document.createElement("button");

    fireClick(el);
    fireClick(el);

    expect(ctx.emit).not.toHaveBeenCalled();

    tracker.destroy();
  });

  it("does NOT emit when clicks are spread beyond 1 second", () => {
    const tracker = rageClicks();
    const ctx = createMockContext();
    tracker.init(ctx);

    const el = document.createElement("button");

    jest.setSystemTime(1000);
    fireClick(el);
    fireClick(el);

    jest.setSystemTime(2001);
    fireClick(el);

    expect(ctx.emit).not.toHaveBeenCalled();

    tracker.destroy();
  });

  it("does NOT emit for rapid clicks on different elements", () => {
    const tracker = rageClicks();
    const ctx = createMockContext();
    tracker.init(ctx);

    const el1 = document.createElement("button");
    const el2 = document.createElement("button");
    const el3 = document.createElement("button");

    fireClick(el1);
    fireClick(el2);
    fireClick(el3);

    expect(ctx.emit).not.toHaveBeenCalled();

    tracker.destroy();
  });

  it("includes element_tag, element_text, click_count in emitted props", () => {
    const tracker = rageClicks();
    const ctx = createMockContext();
    tracker.init(ctx);

    const el = document.createElement("div");
    el.textContent = "Test content";

    fireClick(el);
    fireClick(el);
    fireClick(el);

    expect(ctx.emit).toHaveBeenCalledWith("rage_click", {
      element_tag: "DIV",
      element_text: "Test content",
      click_count: 3,
      page_name: "home",
    });

    tracker.destroy();
  });

  it("truncates element_text to 100 chars", () => {
    const tracker = rageClicks();
    const ctx = createMockContext();
    tracker.init(ctx);

    const el = document.createElement("span");
    el.textContent = "a".repeat(150);

    fireClick(el);
    fireClick(el);
    fireClick(el);

    const emitted = (ctx.emit as jest.Mock).mock.calls[0][1];
    expect(emitted.element_text).toBe("a".repeat(100));
    expect(emitted.element_text.length).toBe(100);

    tracker.destroy();
  });

  it("resets click tracking on route change", () => {
    const tracker = rageClicks();
    const ctx = createMockContext();
    tracker.init(ctx);

    const el = document.createElement("button");

    fireClick(el);
    fireClick(el);

    tracker.onRouteChange!("/new", "/old");

    fireClick(el);
    fireClick(el);

    expect(ctx.emit).not.toHaveBeenCalled();

    fireClick(el);

    expect(ctx.emit).toHaveBeenCalledTimes(1);

    tracker.destroy();
  });

  it("removes click listener on destroy", () => {
    const tracker = rageClicks();
    const ctx = createMockContext();
    tracker.init(ctx);
    tracker.destroy();

    const el = document.createElement("button");

    fireClick(el);
    fireClick(el);
    fireClick(el);

    expect(ctx.emit).not.toHaveBeenCalled();
  });

  it("supports custom threshold config", () => {
    const tracker = rageClicks({ threshold: 2 });
    const ctx = createMockContext();
    tracker.init(ctx);

    const el = document.createElement("button");

    fireClick(el);
    fireClick(el);

    expect(ctx.emit).toHaveBeenCalledWith("rage_click", {
      element_tag: "BUTTON",
      element_text: "",
      click_count: 2,
      page_name: "home",
    });

    tracker.destroy();
  });

  it("supports custom window config", () => {
    const tracker = rageClicks({ window: 500 });
    const ctx = createMockContext();
    tracker.init(ctx);

    const el = document.createElement("button");

    jest.setSystemTime(1000);
    fireClick(el);
    fireClick(el);

    // Third click at 501ms later — outside the 500ms window
    jest.setSystemTime(1501);
    fireClick(el);

    expect(ctx.emit).not.toHaveBeenCalled();

    tracker.destroy();
  });

  it("ignores clicks with null target", () => {
    const tracker = rageClicks();
    const ctx = createMockContext();
    tracker.init(ctx);

    const event = new MouseEvent("click", { bubbles: false });
    // target defaults to null when dispatched on document with no element
    Object.defineProperty(event, "target", { value: null, writable: false });
    document.dispatchEvent(event);

    expect(ctx.emit).not.toHaveBeenCalled();

    tracker.destroy();
  });

  it("resets click log for element after rage_click is emitted", () => {
    const tracker = rageClicks();
    const ctx = createMockContext();
    tracker.init(ctx);

    const el = document.createElement("button");

    // First rage click
    fireClick(el);
    fireClick(el);
    fireClick(el);

    expect(ctx.emit).toHaveBeenCalledTimes(1);

    // After reset, need 3 more to trigger again
    fireClick(el);
    fireClick(el);

    expect(ctx.emit).toHaveBeenCalledTimes(1);

    fireClick(el);

    expect(ctx.emit).toHaveBeenCalledTimes(2);

    tracker.destroy();
  });
});
