import {
  getCookie,
  setCookie,
  deleteCookie,
  generateId,
  isLocalStorageAvailable,
  isSessionStorageAvailable,
} from "../../utils/cookies";

describe("cookie utilities", () => {
  beforeEach(() => {
    Object.defineProperty(document, "cookie", {
      writable: true,
      value: "",
    });
  });

  describe("getCookie", () => {
    it("returns the value of an existing cookie", () => {
      document.cookie = "foo=bar; baz=qux";
      expect(getCookie("foo")).toBe("bar");
      expect(getCookie("baz")).toBe("qux");
    });

    it("returns null for a non-existent cookie", () => {
      document.cookie = "foo=bar";
      expect(getCookie("missing")).toBeNull();
    });

    it("handles URI-encoded values", () => {
      document.cookie = "encoded=hello%20world";
      expect(getCookie("encoded")).toBe("hello world");
    });
  });

  describe("setCookie", () => {
    it("sets a basic cookie", () => {
      setCookie("test", "value");
      expect(document.cookie).toContain("test=value");
    });

    it("sets a cookie with options", () => {
      setCookie("test", "value", {
        path: "/",
        domain: "example.com",
        sameSite: "Lax",
        secure: true,
      });
      const cookie = document.cookie;
      expect(cookie).toContain("test=value");
      expect(cookie).toContain("path=/");
      expect(cookie).toContain("domain=example.com");
      expect(cookie).toContain("SameSite=Lax");
      expect(cookie).toContain("Secure");
    });

    it("sets a cookie with expiry days", () => {
      setCookie("test", "value", { days: 7 });
      expect(document.cookie).toContain("test=value");
      expect(document.cookie).toContain("expires=");
    });
  });

  describe("deleteCookie", () => {
    it("deletes a cookie by setting it expired", () => {
      setCookie("toDelete", "value");
      deleteCookie("toDelete");
      expect(document.cookie).toContain("toDelete=");
      expect(document.cookie).toContain("expires=");
    });

    it("deletes a cookie with a specific path", () => {
      deleteCookie("toDelete", "/custom");
      expect(document.cookie).toContain("path=/custom");
    });
  });

  describe("generateId", () => {
    it("returns a non-empty string", () => {
      const id = generateId();
      expect(id).toBeTruthy();
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    });

    it("returns unique values on successive calls", () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateId()));
      expect(ids.size).toBe(100);
    });
  });

  describe("isLocalStorageAvailable", () => {
    it("returns true when localStorage is available", () => {
      expect(isLocalStorageAvailable()).toBe(true);
    });

    it("returns false when localStorage throws", () => {
      const original = window.localStorage;
      Object.defineProperty(window, "localStorage", {
        get: () => {
          throw new Error("blocked");
        },
        configurable: true,
      });
      expect(isLocalStorageAvailable()).toBe(false);
      Object.defineProperty(window, "localStorage", {
        get: () => original,
        configurable: true,
      });
    });
  });

  describe("isSessionStorageAvailable", () => {
    it("returns true when sessionStorage is available", () => {
      expect(isSessionStorageAvailable()).toBe(true);
    });

    it("returns false when sessionStorage throws", () => {
      const original = window.sessionStorage;
      Object.defineProperty(window, "sessionStorage", {
        get: () => {
          throw new Error("blocked");
        },
        configurable: true,
      });
      expect(isSessionStorageAvailable()).toBe(false);
      Object.defineProperty(window, "sessionStorage", {
        get: () => original,
        configurable: true,
      });
    });
  });
});
