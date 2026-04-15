import { deadClicks } from "../../trackers/dead-clicks";
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
  const event = new MouseEvent("click", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "target", { value: target, configurable: true });
  document.dispatchEvent(event);
}

describe("deadClicks tracker", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("has correct name", () => {
    expect(deadClicks().name).toBe("dead-clicks");
  });

  it("emits dead_click for a click on a plain div", () => {
    const tracker = deadClicks();
    const ctx = createMockContext();
    tracker.init(ctx);

    const div = document.createElement("div");
    div.textContent = "Click me";
    document.body.appendChild(div);

    fireClick(div);
    jest.advanceTimersByTime(500);

    expect(ctx.emit).toHaveBeenCalledWith("dead_click", {
      element_tag: "DIV",
      element_text: "Click me",
      page_name: "home",
    });

    tracker.destroy();
    document.body.removeChild(div);
  });

  it("does NOT emit for a button click", () => {
    const tracker = deadClicks();
    const ctx = createMockContext();
    tracker.init(ctx);

    const btn = document.createElement("button");
    document.body.appendChild(btn);

    fireClick(btn);
    jest.advanceTimersByTime(500);

    expect(ctx.emit).not.toHaveBeenCalled();

    tracker.destroy();
    document.body.removeChild(btn);
  });

  it("does NOT emit for an anchor click", () => {
    const tracker = deadClicks();
    const ctx = createMockContext();
    tracker.init(ctx);

    const a = document.createElement("a");
    a.href = "#";
    document.body.appendChild(a);

    fireClick(a);
    jest.advanceTimersByTime(500);

    expect(ctx.emit).not.toHaveBeenCalled();

    tracker.destroy();
    document.body.removeChild(a);
  });

  it("does NOT emit for an input click", () => {
    const tracker = deadClicks();
    const ctx = createMockContext();
    tracker.init(ctx);

    const input = document.createElement("input");
    document.body.appendChild(input);

    fireClick(input);
    jest.advanceTimersByTime(500);

    expect(ctx.emit).not.toHaveBeenCalled();

    tracker.destroy();
    document.body.removeChild(input);
  });

  it("does NOT emit for a select click", () => {
    const tracker = deadClicks();
    const ctx = createMockContext();
    tracker.init(ctx);

    const select = document.createElement("select");
    document.body.appendChild(select);

    fireClick(select);
    jest.advanceTimersByTime(500);

    expect(ctx.emit).not.toHaveBeenCalled();

    tracker.destroy();
    document.body.removeChild(select);
  });

  it("does NOT emit for a textarea click", () => {
    const tracker = deadClicks();
    const ctx = createMockContext();
    tracker.init(ctx);

    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);

    fireClick(textarea);
    jest.advanceTimersByTime(500);

    expect(ctx.emit).not.toHaveBeenCalled();

    tracker.destroy();
    document.body.removeChild(textarea);
  });

  it("does NOT emit for a label click", () => {
    const tracker = deadClicks();
    const ctx = createMockContext();
    tracker.init(ctx);

    const label = document.createElement("label");
    document.body.appendChild(label);

    fireClick(label);
    jest.advanceTimersByTime(500);

    expect(ctx.emit).not.toHaveBeenCalled();

    tracker.destroy();
    document.body.removeChild(label);
  });

  it("does NOT emit for an element with role=button", () => {
    const tracker = deadClicks();
    const ctx = createMockContext();
    tracker.init(ctx);

    const div = document.createElement("div");
    div.setAttribute("role", "button");
    document.body.appendChild(div);

    fireClick(div);
    jest.advanceTimersByTime(500);

    expect(ctx.emit).not.toHaveBeenCalled();

    tracker.destroy();
    document.body.removeChild(div);
  });

  it("does NOT emit for an element with role=link", () => {
    const tracker = deadClicks();
    const ctx = createMockContext();
    tracker.init(ctx);

    const div = document.createElement("div");
    div.setAttribute("role", "link");
    document.body.appendChild(div);

    fireClick(div);
    jest.advanceTimersByTime(500);

    expect(ctx.emit).not.toHaveBeenCalled();

    tracker.destroy();
    document.body.removeChild(div);
  });

  it("does NOT emit for an element with role=tab", () => {
    const tracker = deadClicks();
    const ctx = createMockContext();
    tracker.init(ctx);

    const div = document.createElement("div");
    div.setAttribute("role", "tab");
    document.body.appendChild(div);

    fireClick(div);
    jest.advanceTimersByTime(500);

    expect(ctx.emit).not.toHaveBeenCalled();

    tracker.destroy();
    document.body.removeChild(div);
  });

  it("does NOT emit for an element with data-abs-track", () => {
    const tracker = deadClicks();
    const ctx = createMockContext();
    tracker.init(ctx);

    const div = document.createElement("div");
    div.setAttribute("data-abs-track", "click");
    document.body.appendChild(div);

    fireClick(div);
    jest.advanceTimersByTime(500);

    expect(ctx.emit).not.toHaveBeenCalled();

    tracker.destroy();
    document.body.removeChild(div);
  });

  it("does NOT emit for a child of an interactive element (span inside button)", () => {
    const tracker = deadClicks();
    const ctx = createMockContext();
    tracker.init(ctx);

    const btn = document.createElement("button");
    const span = document.createElement("span");
    span.textContent = "Label";
    btn.appendChild(span);
    document.body.appendChild(btn);

    fireClick(span);
    jest.advanceTimersByTime(500);

    expect(ctx.emit).not.toHaveBeenCalled();

    tracker.destroy();
    document.body.removeChild(btn);
  });

  it("includes element_tag and element_text in props", () => {
    const tracker = deadClicks();
    const ctx = createMockContext();
    tracker.init(ctx);

    const div = document.createElement("div");
    div.textContent = "  hello world  ";
    document.body.appendChild(div);

    fireClick(div);
    jest.advanceTimersByTime(500);

    expect(ctx.emit).toHaveBeenCalledWith("dead_click", {
      element_tag: "DIV",
      element_text: "hello world",
      page_name: "home",
    });

    tracker.destroy();
    document.body.removeChild(div);
  });

  it("truncates element_text to 100 characters", () => {
    const tracker = deadClicks();
    const ctx = createMockContext();
    tracker.init(ctx);

    const div = document.createElement("div");
    div.textContent = "a".repeat(150);
    document.body.appendChild(div);

    fireClick(div);
    jest.advanceTimersByTime(500);

    expect(ctx.emit).toHaveBeenCalledWith(
      "dead_click",
      expect.objectContaining({ element_text: "a".repeat(100) }),
    );

    tracker.destroy();
    document.body.removeChild(div);
  });

  it("removes listener on destroy", () => {
    const tracker = deadClicks();
    const ctx = createMockContext();
    tracker.init(ctx);
    tracker.destroy();

    const div = document.createElement("div");
    document.body.appendChild(div);

    fireClick(div);
    jest.advanceTimersByTime(500);

    expect(ctx.emit).not.toHaveBeenCalled();

    document.body.removeChild(div);
  });

  it("ignores clicks with null target", () => {
    const tracker = deadClicks();
    const ctx = createMockContext();
    tracker.init(ctx);

    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "target", { value: null, configurable: true });
    document.dispatchEvent(event);

    jest.advanceTimersByTime(500);

    expect(ctx.emit).not.toHaveBeenCalled();

    tracker.destroy();
  });

  it("debounces — one dead_click per element per 1 second", () => {
    const tracker = deadClicks();
    const ctx = createMockContext();
    tracker.init(ctx);

    const div = document.createElement("div");
    document.body.appendChild(div);

    // First click — should emit
    fireClick(div);
    jest.advanceTimersByTime(500);

    expect(ctx.emit).toHaveBeenCalledTimes(1);

    // Second click immediately after — should be suppressed (within 1s cooldown)
    fireClick(div);
    jest.advanceTimersByTime(500);

    expect(ctx.emit).toHaveBeenCalledTimes(1);

    // Advance past the 1s cooldown
    jest.advanceTimersByTime(1000);

    // Third click after cooldown — should emit again
    fireClick(div);
    jest.advanceTimersByTime(500);

    expect(ctx.emit).toHaveBeenCalledTimes(2);

    tracker.destroy();
    document.body.removeChild(div);
  });

  it("clears pending timers on destroy", () => {
    const tracker = deadClicks();
    const ctx = createMockContext();
    tracker.init(ctx);

    const div = document.createElement("div");
    document.body.appendChild(div);

    fireClick(div);

    // Destroy before the 500ms timer fires
    tracker.destroy();

    jest.advanceTimersByTime(500);

    expect(ctx.emit).not.toHaveBeenCalled();

    document.body.removeChild(div);
  });

  it("does NOT emit for elements with contenteditable='true'", () => {
    const tracker = deadClicks();
    const ctx = createMockContext();
    tracker.init(ctx);

    const div = document.createElement("div");
    div.setAttribute("contenteditable", "true");
    document.body.appendChild(div);

    fireClick(div);
    jest.advanceTimersByTime(500);

    expect(ctx.emit).not.toHaveBeenCalled();

    tracker.destroy();
    document.body.removeChild(div);
  });

  it("does NOT emit for elements with onclick attribute", () => {
    const tracker = deadClicks();
    const ctx = createMockContext();
    tracker.init(ctx);

    const div = document.createElement("div");
    div.setAttribute("onclick", "doSomething()");
    document.body.appendChild(div);

    fireClick(div);
    jest.advanceTimersByTime(500);

    expect(ctx.emit).not.toHaveBeenCalled();

    tracker.destroy();
    document.body.removeChild(div);
  });
});
