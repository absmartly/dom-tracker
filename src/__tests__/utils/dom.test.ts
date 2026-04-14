import { getPageName, parseDataAttributes } from "../../utils/dom";

describe("getPageName", () => {
  it("returns the last path segment", () => {
    expect(getPageName(new URL("https://example.com/products"))).toBe(
      "products",
    );
  });

  it('returns "homepage" for root path', () => {
    expect(getPageName(new URL("https://example.com/"))).toBe("homepage");
    expect(getPageName(new URL("https://example.com"))).toBe("homepage");
  });

  it("handles nested paths", () => {
    expect(
      getPageName(new URL("https://example.com/shop/electronics/phones")),
    ).toBe("phones");
  });

  it("handles trailing slashes", () => {
    expect(getPageName(new URL("https://example.com/about/"))).toBe("about");
  });
});

describe("parseDataAttributes", () => {
  function createElement(attrs: Record<string, string>): Element {
    const el = document.createElement("div");
    for (const [key, value] of Object.entries(attrs)) {
      el.setAttribute(key, value);
    }
    return el;
  }

  it("extracts data-abs-* attributes excluding data-abs-track", () => {
    const el = createElement({
      "data-abs-track": "click",
      "data-abs-goal": "signup",
      "data-abs-label": "hero-button",
    });
    const result = parseDataAttributes(el);
    expect(result).toEqual({ goal: "signup", label: "hero-button" });
    expect(result).not.toHaveProperty("track");
  });

  it("converts kebab-case to snake_case", () => {
    const el = createElement({
      "data-abs-user-name": "alice",
      "data-abs-click-count": "5",
    });
    const result = parseDataAttributes(el);
    expect(result).toHaveProperty("user_name", "alice");
    expect(result).toHaveProperty("click_count", 5);
  });

  it("coerces boolean strings", () => {
    const el = createElement({
      "data-abs-enabled": "true",
      "data-abs-disabled": "false",
    });
    const result = parseDataAttributes(el);
    expect(result).toEqual({ enabled: true, disabled: false });
  });

  it("coerces numeric strings", () => {
    const el = createElement({
      "data-abs-count": "42",
      "data-abs-price": "19.99",
    });
    const result = parseDataAttributes(el);
    expect(result).toEqual({ count: 42, price: 19.99 });
  });

  it("returns empty object when no extra data-abs-* attributes", () => {
    const el = createElement({ "data-abs-track": "click" });
    expect(parseDataAttributes(el)).toEqual({});
  });

  it("returns empty object when element has no data-abs attributes", () => {
    const el = createElement({ class: "button", id: "btn" });
    expect(parseDataAttributes(el)).toEqual({});
  });
});
