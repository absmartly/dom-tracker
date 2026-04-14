import { sessionTracker } from "../../trackers/session";
import { TrackerContext } from "../../core/types";

jest.mock("../../utils/cookies", () => ({
  getCookie: jest.fn(),
  setCookie: jest.fn(),
  generateId: jest.fn().mockReturnValue("generated-id"),
  isLocalStorageAvailable: jest.fn().mockReturnValue(false),
  isSessionStorageAvailable: jest.fn().mockReturnValue(false),
}));

import {
  getCookie,
  setCookie,
  generateId,
  isLocalStorageAvailable,
  isSessionStorageAvailable,
} from "../../utils/cookies";

const mockGetCookie = getCookie as jest.MockedFunction<typeof getCookie>;
const mockSetCookie = setCookie as jest.MockedFunction<typeof setCookie>;
const mockGenerateId = generateId as jest.MockedFunction<typeof generateId>;
const mockIsLocalStorageAvailable =
  isLocalStorageAvailable as jest.MockedFunction<
    typeof isLocalStorageAvailable
  >;
const mockIsSessionStorageAvailable =
  isSessionStorageAvailable as jest.MockedFunction<
    typeof isSessionStorageAvailable
  >;

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

describe("sessionTracker", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockGenerateId.mockReturnValue("generated-id");
    mockIsLocalStorageAvailable.mockReturnValue(false);
    mockIsSessionStorageAvailable.mockReturnValue(false);

    Object.defineProperty(window, "location", {
      value: {
        href: "https://example.com/landing",
        pathname: "/landing",
        search: "",
      },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(document, "referrer", {
      value: "",
      writable: true,
      configurable: true,
    });
  });

  it("has correct name", () => {
    expect(sessionTracker().name).toBe("session");
  });

  it("emits session_start for new sessions", () => {
    mockGetCookie.mockReturnValue(null);
    mockGenerateId
      .mockReturnValueOnce("visitor-id")
      .mockReturnValueOnce("session-id");

    const tracker = sessionTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    expect(ctx.emit).toHaveBeenCalledWith("session_start", {
      session_id: "session-id",
      landing_page: "/landing",
      referrer: "",
    });
  });

  it("sets returning_visitor=false for new visitors", () => {
    mockGetCookie.mockReturnValue(null);
    mockGenerateId
      .mockReturnValueOnce("visitor-id")
      .mockReturnValueOnce("session-id");

    const tracker = sessionTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    expect(ctx.setAttributes).toHaveBeenCalledWith(
      expect.objectContaining({ returning_visitor: false }),
    );
  });

  it("sets returning_visitor=true when visitor cookie exists", () => {
    mockGetCookie
      .mockReturnValueOnce("existing-visitor-id")
      .mockReturnValueOnce(null);
    mockGenerateId.mockReturnValueOnce("session-id");

    const tracker = sessionTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    expect(ctx.setAttributes).toHaveBeenCalledWith(
      expect.objectContaining({ returning_visitor: true }),
    );
  });

  it("does not emit session_start when session cookie exists", () => {
    mockGetCookie
      .mockReturnValueOnce("existing-visitor-id")
      .mockReturnValueOnce("existing-session-id");

    const tracker = sessionTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    expect(ctx.emit).not.toHaveBeenCalled();
  });

  it("sets session cookie", () => {
    mockGetCookie.mockReturnValue(null);
    mockGenerateId
      .mockReturnValueOnce("visitor-id")
      .mockReturnValueOnce("session-id");

    const tracker = sessionTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    expect(mockSetCookie).toHaveBeenCalledWith(
      "_abs_session",
      "session-id",
      expect.objectContaining({ days: 1 }),
    );
  });

  it("extracts UTM params from URL", () => {
    Object.defineProperty(window, "location", {
      value: {
        href: "https://example.com/landing?utm_source=google&utm_medium=cpc&utm_campaign=test",
        pathname: "/landing",
        search: "?utm_source=google&utm_medium=cpc&utm_campaign=test",
      },
      writable: true,
      configurable: true,
    });

    mockGetCookie.mockReturnValue(null);
    mockGenerateId
      .mockReturnValueOnce("visitor-id")
      .mockReturnValueOnce("session-id");

    const tracker = sessionTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    expect(ctx.setAttributes).toHaveBeenCalledWith(
      expect.objectContaining({
        utm_source: "google",
        utm_medium: "cpc",
        utm_campaign: "test",
      }),
    );
  });

  it("falls back to sessionStorage when cookies are unavailable for session", () => {
    mockGetCookie.mockReturnValue(null);
    mockIsSessionStorageAvailable.mockReturnValue(true);
    mockGenerateId
      .mockReturnValueOnce("visitor-id")
      .mockReturnValueOnce("session-id");

    const sessionStorageMock: Record<string, string> = {};
    Object.defineProperty(window, "sessionStorage", {
      value: {
        getItem: jest.fn((key: string) => sessionStorageMock[key] ?? null),
        setItem: jest.fn((key: string, value: string) => {
          sessionStorageMock[key] = value;
        }),
        removeItem: jest.fn(),
      },
      writable: true,
      configurable: true,
    });

    mockSetCookie.mockImplementation(() => {
      throw new Error("cookies blocked");
    });

    const tracker = sessionTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
      "_abs_session",
      "session-id",
    );
  });

  it("falls back to localStorage when cookies are unavailable for visitor", () => {
    mockGetCookie.mockReturnValue(null);
    mockIsLocalStorageAvailable.mockReturnValue(true);
    mockGenerateId
      .mockReturnValueOnce("visitor-id")
      .mockReturnValueOnce("session-id");

    const localStorageMock: Record<string, string> = {};
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: jest.fn((key: string) => localStorageMock[key] ?? null),
        setItem: jest.fn((key: string, value: string) => {
          localStorageMock[key] = value;
        }),
        removeItem: jest.fn(),
      },
      writable: true,
      configurable: true,
    });

    mockSetCookie.mockImplementation(() => {
      throw new Error("cookies blocked");
    });

    const tracker = sessionTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      "_abs_visitor",
      "visitor-id",
    );
  });

  it("sets device attribute", () => {
    mockGetCookie.mockReturnValue(null);
    mockGenerateId
      .mockReturnValueOnce("visitor-id")
      .mockReturnValueOnce("session-id");

    const tracker = sessionTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    expect(ctx.setAttributes).toHaveBeenCalledWith(
      expect.objectContaining({
        device: expect.stringMatching(/^(desktop|mobile|tablet)$/),
      }),
    );
  });

  it("does not emit after destroy", () => {
    mockGetCookie.mockReturnValue(null);
    mockGenerateId
      .mockReturnValueOnce("visitor-id")
      .mockReturnValueOnce("session-id");

    const tracker = sessionTracker();
    const ctx = createMockContext();
    tracker.init(ctx);
    tracker.destroy();

    expect(ctx).toBeTruthy();
  });

  it("detects organic traffic from search engine referrer", () => {
    Object.defineProperty(document, "referrer", {
      value: "https://www.google.com/search?q=test",
      writable: true,
      configurable: true,
    });

    mockGetCookie.mockReturnValue(null);
    mockGenerateId
      .mockReturnValueOnce("visitor-id")
      .mockReturnValueOnce("session-id");

    const tracker = sessionTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    expect(ctx.setAttributes).toHaveBeenCalledWith(
      expect.objectContaining({ traffic_source: "organic" }),
    );
  });

  it("detects social traffic from social media referrer", () => {
    Object.defineProperty(document, "referrer", {
      value: "https://www.facebook.com/some-post",
      writable: true,
      configurable: true,
    });

    mockGetCookie.mockReturnValue(null);
    mockGenerateId
      .mockReturnValueOnce("visitor-id")
      .mockReturnValueOnce("session-id");

    const tracker = sessionTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    expect(ctx.setAttributes).toHaveBeenCalledWith(
      expect.objectContaining({ traffic_source: "social" }),
    );
  });

  it("detects referral traffic from unknown referrer", () => {
    Object.defineProperty(document, "referrer", {
      value: "https://www.someotherblog.com/article",
      writable: true,
      configurable: true,
    });

    mockGetCookie.mockReturnValue(null);
    mockGenerateId
      .mockReturnValueOnce("visitor-id")
      .mockReturnValueOnce("session-id");

    const tracker = sessionTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    expect(ctx.setAttributes).toHaveBeenCalledWith(
      expect.objectContaining({ traffic_source: "referral" }),
    );
  });

  it("falls back to direct when referrer is an invalid URL", () => {
    Object.defineProperty(document, "referrer", {
      value: "not-a-valid-url",
      writable: true,
      configurable: true,
    });

    mockGetCookie.mockReturnValue(null);
    mockGenerateId
      .mockReturnValueOnce("visitor-id")
      .mockReturnValueOnce("session-id");

    const tracker = sessionTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    expect(ctx.setAttributes).toHaveBeenCalledWith(
      expect.objectContaining({ traffic_source: "direct" }),
    );
  });

  it("recovers visitor ID from localStorage when cookie is absent", () => {
    // First call for visitor cookie returns null, second for session cookie returns null
    mockGetCookie.mockReturnValue(null);
    mockIsLocalStorageAvailable.mockReturnValue(true);
    mockGenerateId.mockReturnValueOnce("session-id");

    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: jest.fn((key: string) =>
          key === "_abs_visitor" ? "stored-visitor-id" : null,
        ),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
      configurable: true,
    });

    const tracker = sessionTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    expect(ctx.setAttributes).toHaveBeenCalledWith(
      expect.objectContaining({ returning_visitor: true }),
    );
    expect(mockSetCookie).toHaveBeenCalledWith(
      "_abs_visitor",
      "stored-visitor-id",
      expect.objectContaining({ days: 365 }),
    );
  });

  it("recovers session ID from sessionStorage when cookie is absent", () => {
    // Visitor cookie exists, session cookie doesn't
    mockGetCookie
      .mockReturnValueOnce("existing-visitor-id")
      .mockReturnValueOnce(null);
    mockIsSessionStorageAvailable.mockReturnValue(true);

    Object.defineProperty(window, "sessionStorage", {
      value: {
        getItem: jest.fn((key: string) =>
          key === "_abs_session" ? "stored-session-id" : null,
        ),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
      configurable: true,
    });

    const tracker = sessionTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    // Session is not new, so no session_start event should be emitted
    expect(ctx.emit).not.toHaveBeenCalled();
    expect(mockSetCookie).toHaveBeenCalledWith(
      "_abs_session",
      "stored-session-id",
      expect.objectContaining({ days: 1 }),
    );
  });

  it("detects paid traffic when utm_source is present", () => {
    Object.defineProperty(window, "location", {
      value: {
        href: "https://example.com/landing?utm_source=google",
        pathname: "/landing",
        search: "?utm_source=google",
      },
      writable: true,
      configurable: true,
    });

    mockGetCookie.mockReturnValue(null);
    mockGenerateId
      .mockReturnValueOnce("visitor-id")
      .mockReturnValueOnce("session-id");

    const tracker = sessionTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    expect(ctx.setAttributes).toHaveBeenCalledWith(
      expect.objectContaining({ traffic_source: "paid" }),
    );
  });

  it("detects tablet device", () => {
    const originalUserAgent = navigator.userAgent;
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X)",
      writable: true,
      configurable: true,
    });

    mockGetCookie.mockReturnValue(null);
    mockGenerateId
      .mockReturnValueOnce("visitor-id")
      .mockReturnValueOnce("session-id");

    const tracker = sessionTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    expect(ctx.setAttributes).toHaveBeenCalledWith(
      expect.objectContaining({ device: "tablet" }),
    );

    Object.defineProperty(navigator, "userAgent", {
      value: originalUserAgent,
      writable: true,
      configurable: true,
    });
  });

  it("detects mobile device", () => {
    const originalUserAgent = navigator.userAgent;
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
      writable: true,
      configurable: true,
    });

    mockGetCookie.mockReturnValue(null);
    mockGenerateId
      .mockReturnValueOnce("visitor-id")
      .mockReturnValueOnce("session-id");

    const tracker = sessionTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    expect(ctx.setAttributes).toHaveBeenCalledWith(
      expect.objectContaining({ device: "mobile" }),
    );

    Object.defineProperty(navigator, "userAgent", {
      value: originalUserAgent,
      writable: true,
      configurable: true,
    });
  });

  it("works with explicit cookieDomain config", () => {
    mockGetCookie.mockReturnValue(null);
    mockGenerateId
      .mockReturnValueOnce("visitor-id")
      .mockReturnValueOnce("session-id");

    const tracker = sessionTracker({ cookieDomain: ".example.com" });
    const ctx = createMockContext();
    tracker.init(ctx);

    expect(mockSetCookie).toHaveBeenCalledWith(
      "_abs_visitor",
      "visitor-id",
      expect.objectContaining({ domain: ".example.com" }),
    );
  });
});
