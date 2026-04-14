import { ElementScanner } from "../../core/ElementScanner";

describe("ElementScanner", () => {
  let emit: jest.Mock;
  let getPageName: jest.Mock;
  let scanner: ElementScanner;

  beforeEach(() => {
    emit = jest.fn();
    getPageName = jest.fn().mockReturnValue("test-page");
    scanner = new ElementScanner(emit, getPageName, false);
    document.body.innerHTML = "";
  });

  afterEach(() => {
    scanner.destroy();
  });

  it("emits event when clicking a data-abs-track element", () => {
    document.body.innerHTML =
      '<button data-abs-track="btn_click" data-abs-label="signup">Sign Up</button>';
    scanner.scan();

    const btn = document.querySelector("button")!;
    btn.click();

    expect(emit).toHaveBeenCalledWith("btn_click", {
      label: "signup",
      page_name: "test-page",
    });
  });

  it("includes multiple data-abs-* props", () => {
    document.body.innerHTML =
      '<div data-abs-track="card_click" data-abs-category="promo" data-abs-position="1"></div>';
    scanner.scan();

    const div = document.querySelector("div")!;
    div.click();

    expect(emit).toHaveBeenCalledWith("card_click", {
      category: "promo",
      position: 1,
      page_name: "test-page",
    });
  });

  it("works via delegation for elements added after scan", () => {
    scanner.scan();

    const btn = document.createElement("button");
    btn.setAttribute("data-abs-track", "dynamic_click");
    btn.setAttribute("data-abs-source", "ajax");
    document.body.appendChild(btn);

    btn.click();

    expect(emit).toHaveBeenCalledWith("dynamic_click", {
      source: "ajax",
      page_name: "test-page",
    });
  });

  it("ignores clicks on elements without data-abs-track", () => {
    document.body.innerHTML = "<button>Plain</button>";
    scanner.scan();

    document.querySelector("button")!.click();

    expect(emit).not.toHaveBeenCalled();
  });

  it("finds the closest data-abs-track ancestor", () => {
    document.body.innerHTML =
      '<div data-abs-track="wrapper_click" data-abs-id="42"><span><em>text</em></span></div>';
    scanner.scan();

    document.querySelector("em")!.click();

    expect(emit).toHaveBeenCalledWith("wrapper_click", {
      id: 42,
      page_name: "test-page",
    });
  });

  it("stops emitting after destroy", () => {
    document.body.innerHTML =
      '<button data-abs-track="btn_click">Click</button>';
    scanner.scan();
    scanner.destroy();

    document.querySelector("button")!.click();

    expect(emit).not.toHaveBeenCalled();
  });

  it("does not emit when data-abs-track value is empty", () => {
    document.body.innerHTML = '<button data-abs-track="">Click</button>';
    scanner.scan();

    document.querySelector("button")!.click();

    expect(emit).not.toHaveBeenCalled();
  });

  it("debounces duplicate events within 500ms", () => {
    jest.useFakeTimers();
    document.body.innerHTML =
      '<button data-abs-track="btn_click" data-abs-label="signup">Sign Up</button>';
    scanner.scan();

    const btn = document.querySelector("button")!;
    btn.click();
    btn.click();
    btn.click();

    expect(emit).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it("does not emit when event target is null", () => {
    scanner.scan();

    const event = new Event("click", { bubbles: true });
    Object.defineProperty(event, "target", { value: null, configurable: true });
    window.dispatchEvent(event);

    expect(emit).not.toHaveBeenCalled();
  });
});
