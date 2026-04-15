import { outboundLinks } from "../../trackers/outbound-links";
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

describe("outboundLinks tracker", () => {
  const originalHostname = window.location.hostname;

  beforeEach(() => {
    Object.defineProperty(window, "location", {
      value: { ...window.location, hostname: "example.com" },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      value: { ...window.location, hostname: originalHostname },
      writable: true,
      configurable: true,
    });
  });

  it("has correct name", () => {
    expect(outboundLinks().name).toBe("outbound-links");
  });

  it("emits outbound_click for external link (different hostname)", () => {
    const tracker = outboundLinks();
    const ctx = createMockContext();
    tracker.init(ctx);

    const anchor = document.createElement("a");
    anchor.href = "https://external.com/path";
    anchor.textContent = "Visit External";
    document.body.appendChild(anchor);

    fireClick(anchor);

    expect(ctx.emit).toHaveBeenCalledWith("outbound_click", {
      url: "https://external.com/path",
      hostname: "external.com",
      link_text: "Visit External",
      page_name: "home",
    });

    tracker.destroy();
    document.body.removeChild(anchor);
  });

  it("does NOT emit for internal link (same hostname)", () => {
    const tracker = outboundLinks();
    const ctx = createMockContext();
    tracker.init(ctx);

    const anchor = document.createElement("a");
    anchor.href = "https://example.com/internal-page";
    anchor.textContent = "Internal";
    document.body.appendChild(anchor);

    fireClick(anchor);

    expect(ctx.emit).not.toHaveBeenCalled();

    tracker.destroy();
    document.body.removeChild(anchor);
  });

  it("does NOT emit for anchor without href", () => {
    const tracker = outboundLinks();
    const ctx = createMockContext();
    tracker.init(ctx);

    const anchor = document.createElement("a");
    anchor.textContent = "No href";
    document.body.appendChild(anchor);

    fireClick(anchor);

    expect(ctx.emit).not.toHaveBeenCalled();

    tracker.destroy();
    document.body.removeChild(anchor);
  });

  it("detects outbound link from child element click (span inside anchor)", () => {
    const tracker = outboundLinks();
    const ctx = createMockContext();
    tracker.init(ctx);

    const anchor = document.createElement("a");
    anchor.href = "https://external.com/page";
    const span = document.createElement("span");
    span.textContent = "Click me";
    anchor.appendChild(span);
    document.body.appendChild(anchor);

    fireClick(span);

    expect(ctx.emit).toHaveBeenCalledWith("outbound_click", {
      url: "https://external.com/page",
      hostname: "external.com",
      link_text: "Click me",
      page_name: "home",
    });

    tracker.destroy();
    document.body.removeChild(anchor);
  });

  it("does NOT emit for non-anchor clicks (div)", () => {
    const tracker = outboundLinks();
    const ctx = createMockContext();
    tracker.init(ctx);

    const div = document.createElement("div");
    div.textContent = "Just a div";
    document.body.appendChild(div);

    fireClick(div);

    expect(ctx.emit).not.toHaveBeenCalled();

    tracker.destroy();
    document.body.removeChild(div);
  });

  it("truncates link_text to 100 chars", () => {
    const tracker = outboundLinks();
    const ctx = createMockContext();
    tracker.init(ctx);

    const anchor = document.createElement("a");
    anchor.href = "https://external.com/";
    anchor.textContent = "a".repeat(150);
    document.body.appendChild(anchor);

    fireClick(anchor);

    expect(ctx.emit).toHaveBeenCalledWith(
      "outbound_click",
      expect.objectContaining({ link_text: "a".repeat(100) }),
    );

    tracker.destroy();
    document.body.removeChild(anchor);
  });

  it("removes listener on destroy", () => {
    const tracker = outboundLinks();
    const ctx = createMockContext();
    tracker.init(ctx);
    tracker.destroy();

    const anchor = document.createElement("a");
    anchor.href = "https://external.com/";
    anchor.textContent = "External";
    document.body.appendChild(anchor);

    fireClick(anchor);

    expect(ctx.emit).not.toHaveBeenCalled();

    document.body.removeChild(anchor);
  });

  it("ignores clicks with null target", () => {
    const tracker = outboundLinks();
    const ctx = createMockContext();
    tracker.init(ctx);

    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "target", { value: null, configurable: true });
    document.dispatchEvent(event);

    expect(ctx.emit).not.toHaveBeenCalled();

    tracker.destroy();
  });

  it("handles mailto: links as non-outbound (protocol check)", () => {
    const tracker = outboundLinks();
    const ctx = createMockContext();
    tracker.init(ctx);

    const anchor = document.createElement("a");
    anchor.href = "mailto:user@external.com";
    anchor.textContent = "Email us";
    document.body.appendChild(anchor);

    fireClick(anchor);

    expect(ctx.emit).not.toHaveBeenCalled();

    tracker.destroy();
    document.body.removeChild(anchor);
  });

  it("handles tel: links as non-outbound (protocol check)", () => {
    const tracker = outboundLinks();
    const ctx = createMockContext();
    tracker.init(ctx);

    const anchor = document.createElement("a");
    anchor.href = "tel:+1234567890";
    anchor.textContent = "Call us";
    document.body.appendChild(anchor);

    fireClick(anchor);

    expect(ctx.emit).not.toHaveBeenCalled();

    tracker.destroy();
    document.body.removeChild(anchor);
  });

  it("uses empty string when anchor has no textContent", () => {
    const tracker = outboundLinks();
    const ctx = createMockContext();
    tracker.init(ctx);

    const anchor = document.createElement("a");
    anchor.href = "https://external.com/";
    // Leave textContent as null/empty by setting it explicitly
    Object.defineProperty(anchor, "textContent", {
      value: null,
      configurable: true,
    });
    document.body.appendChild(anchor);

    fireClick(anchor);

    expect(ctx.emit).toHaveBeenCalledWith("outbound_click", {
      url: "https://external.com/",
      hostname: "external.com",
      link_text: "",
      page_name: "home",
    });

    tracker.destroy();
    document.body.removeChild(anchor);
  });

  it("handles invalid href gracefully (try/catch on new URL)", () => {
    const tracker = outboundLinks();
    const ctx = createMockContext();
    tracker.init(ctx);

    const anchor = document.createElement("a");
    // Set a raw invalid href that cannot be parsed as a URL
    Object.defineProperty(anchor, "href", {
      value: "not a valid url ://??",
      configurable: true,
    });
    document.body.appendChild(anchor);

    fireClick(anchor);

    expect(ctx.emit).not.toHaveBeenCalled();

    tracker.destroy();
    document.body.removeChild(anchor);
  });
});
