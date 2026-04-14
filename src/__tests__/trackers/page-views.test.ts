import { pageViews } from "../../trackers/page-views";
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

describe("pageViews tracker", () => {
  beforeEach(() => {
    Object.defineProperty(window, "location", {
      value: {
        pathname: "/test-path",
        href: "https://example.com/test-path",
      },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(document, "referrer", {
      value: "https://referrer.com",
      writable: true,
      configurable: true,
    });
  });

  it("has correct name", () => {
    const tracker = pageViews();
    expect(tracker.name).toBe("page-views");
  });

  it("emits page_view on init", () => {
    const tracker = pageViews();
    const ctx = createMockContext();
    tracker.init(ctx);

    expect(ctx.emit).toHaveBeenCalledWith("page_view", {
      page_name: "home",
      page_path: "/test-path",
      page_url: "https://example.com/test-path",
      referrer: "https://referrer.com",
    });
  });

  it("emits page_view on route change", () => {
    const tracker = pageViews();
    const ctx = createMockContext();
    tracker.init(ctx);

    (ctx.emit as jest.Mock).mockClear();

    Object.defineProperty(window, "location", {
      value: {
        pathname: "/new-path",
        href: "https://example.com/new-path",
      },
      writable: true,
      configurable: true,
    });
    (ctx.getPageName as jest.Mock).mockReturnValue("new-page");

    tracker.onRouteChange!("/new-path", "/test-path");

    expect(ctx.emit).toHaveBeenCalledWith("page_view", {
      page_name: "new-page",
      page_path: "/new-path",
      page_url: "https://example.com/new-path",
      referrer: "https://referrer.com",
    });
  });

  it("does not emit after destroy", () => {
    const tracker = pageViews();
    const ctx = createMockContext();
    tracker.init(ctx);
    tracker.destroy();

    (ctx.emit as jest.Mock).mockClear();
    tracker.onRouteChange!("/new-path", "/test-path");

    expect(ctx.emit).not.toHaveBeenCalled();
  });
});
