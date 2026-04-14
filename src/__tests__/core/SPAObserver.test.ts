import { SPAObserver } from "../../core/SPAObserver";

describe("SPAObserver", () => {
  let onRouteChange: jest.Mock;
  let onDOMMutation: jest.Mock;
  let observer: SPAObserver;

  beforeEach(() => {
    onRouteChange = jest.fn();
    onDOMMutation = jest.fn();
    observer = new SPAObserver({ onRouteChange, onDOMMutation, debug: false });
    document.body.innerHTML = "";
  });

  afterEach(() => {
    observer.destroy();
  });

  it("detects history.pushState route changes", () => {
    observer.start();
    history.pushState({}, "", "/new-page");
    expect(onRouteChange).toHaveBeenCalledWith(
      expect.stringContaining("/new-page"),
      expect.any(String),
    );
  });

  it("detects history.replaceState route changes", () => {
    observer.start();
    history.replaceState({}, "", "/replaced-page");
    expect(onRouteChange).toHaveBeenCalledWith(
      expect.stringContaining("/replaced-page"),
      expect.any(String),
    );
  });

  it("detects popstate events", () => {
    observer.start();
    const prevUrl = window.location.href;
    window.dispatchEvent(new PopStateEvent("popstate", {}));
    expect(onRouteChange).toHaveBeenCalledWith(window.location.href, prevUrl);
  });

  it("restores original pushState/replaceState on destroy", () => {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    observer.start();
    observer.destroy();
    expect(history.pushState).toBe(originalPushState);
    expect(history.replaceState).toBe(originalReplaceState);
  });

  it("does not call onRouteChange after destroy", () => {
    observer.start();
    observer.destroy();
    history.pushState({}, "", "/after-destroy");
    expect(onRouteChange).not.toHaveBeenCalled();
  });

  it("onElementAdded fires for existing matching elements", () => {
    document.body.innerHTML = '<div class="tracked"></div>';
    observer.start();

    const callback = jest.fn();
    observer.onElementAdded(".tracked", callback);

    expect(callback).toHaveBeenCalledWith(document.querySelector(".tracked"));
  });

  it("onElementAdded fires for dynamically added elements", async () => {
    observer.start();
    const callback = jest.fn();
    observer.onElementAdded(".dynamic", callback);

    const el = document.createElement("div");
    el.className = "dynamic";
    document.body.appendChild(el);

    await new Promise((r) => setTimeout(r, 50));

    expect(callback).toHaveBeenCalledWith(el);
  });

  it("unsubscribe from onElementAdded stops future callbacks", async () => {
    observer.start();
    const callback = jest.fn();
    const unsubscribe = observer.onElementAdded(".dynamic", callback);
    unsubscribe();

    const el = document.createElement("div");
    el.className = "dynamic";
    document.body.appendChild(el);

    await new Promise((r) => setTimeout(r, 50));

    expect(callback).not.toHaveBeenCalled();
  });

  it("onElementRemoved fires when element is removed from DOM", async () => {
    const el = document.createElement("div");
    el.className = "removable";
    document.body.appendChild(el);

    observer.start();
    const callback = jest.fn();
    observer.onElementRemoved(".removable", callback);

    document.body.removeChild(el);

    await new Promise((r) => setTimeout(r, 50));

    expect(callback).toHaveBeenCalledWith(el);
  });

  it("unsubscribe from onElementRemoved stops future callbacks", async () => {
    const el = document.createElement("div");
    el.className = "removable";
    document.body.appendChild(el);

    observer.start();
    const callback = jest.fn();
    const unsubscribe = observer.onElementRemoved(".removable", callback);
    unsubscribe();

    document.body.removeChild(el);

    await new Promise((r) => setTimeout(r, 50));

    expect(callback).not.toHaveBeenCalled();
  });

  it("handles invalid selector in onElementAdded gracefully", () => {
    observer.start();
    const callback = jest.fn();
    expect(() =>
      observer.onElementAdded("!!!invalid!!!", callback),
    ).not.toThrow();
    expect(callback).not.toHaveBeenCalled();
  });

  it("detects hashchange events", () => {
    observer.start();
    const prevUrl = window.location.href;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(onRouteChange).toHaveBeenCalledWith(window.location.href, prevUrl);
  });

  it("fires for descendants of added nodes matching subscription", async () => {
    observer.start();
    const callback = jest.fn();
    observer.onElementAdded(".nested-child", callback);

    const parent = document.createElement("div");
    const child = document.createElement("span");
    child.className = "nested-child";
    parent.appendChild(child);
    document.body.appendChild(parent);

    await new Promise((r) => setTimeout(r, 50));

    expect(callback).toHaveBeenCalledWith(child);
  });

  it("handles invalid selector in mutation observer for added nodes", async () => {
    observer.start();
    const callback = jest.fn();
    // Use a valid selector for subscribing, then swap to invalid
    const sub = { selector: "!!!invalid!!!", callback, type: "added" as const };
    (observer as any).subscriptions.push(sub);

    const el = document.createElement("div");
    document.body.appendChild(el);

    await new Promise((r) => setTimeout(r, 50));

    expect(callback).not.toHaveBeenCalled();
  });

  it("handles invalid selector in mutation observer for removed nodes", async () => {
    const el = document.createElement("div");
    document.body.appendChild(el);

    observer.start();
    const callback = jest.fn();
    const sub = {
      selector: "!!!invalid!!!",
      callback,
      type: "removed" as const,
    };
    (observer as any).subscriptions.push(sub);

    document.body.removeChild(el);

    await new Promise((r) => setTimeout(r, 50));

    expect(callback).not.toHaveBeenCalled();
  });

  it("works without onRouteChange handler", () => {
    const obs = new SPAObserver({ onDOMMutation, debug: false });
    obs.start();
    expect(() => history.pushState({}, "", "/no-route-handler")).not.toThrow();
    expect(() =>
      history.replaceState({}, "", "/no-route-handler-2"),
    ).not.toThrow();
    window.dispatchEvent(new PopStateEvent("popstate", {}));
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    obs.destroy();
  });

  it("works without onDOMMutation handler", async () => {
    const obs = new SPAObserver({ onRouteChange, debug: false });
    obs.start();
    const el = document.createElement("div");
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 50));
    obs.destroy();
  });

  it("works with debug undefined (defaults via ?? false)", () => {
    const obs = new SPAObserver({ onRouteChange });
    obs.start();
    history.pushState({}, "", "/debug-undef");
    history.replaceState({}, "", "/debug-undef-replace");
    expect(onRouteChange).toHaveBeenCalledTimes(2);
    obs.destroy();
  });

  it("works with debug true", () => {
    const obs = new SPAObserver({ onRouteChange, onDOMMutation, debug: true });
    obs.start();
    history.pushState({}, "", "/debug-true");
    expect(onRouteChange).toHaveBeenCalled();
    obs.destroy();
  });

  it("handles added node with matching descendant and debug true", async () => {
    const obs = new SPAObserver({ onRouteChange, onDOMMutation, debug: true });
    obs.start();
    const callback = jest.fn();
    obs.onElementAdded(".child", callback);

    const parent = document.createElement("div");
    const child = document.createElement("span");
    child.className = "child";
    parent.appendChild(child);
    document.body.appendChild(parent);

    await new Promise((r) => setTimeout(r, 50));
    expect(callback).toHaveBeenCalledWith(child);
    obs.destroy();
  });

  it("handles invalid selector with debug true in onElementAdded", () => {
    const obs = new SPAObserver({ debug: true });
    const callback = jest.fn();
    expect(() => obs.onElementAdded("!!!invalid!!!", callback)).not.toThrow();
    obs.destroy();
  });

  it("handles invalid selector with debug undefined in onElementAdded", () => {
    const obs = new SPAObserver({});
    const callback = jest.fn();
    expect(() => obs.onElementAdded("!!!invalid!!!", callback)).not.toThrow();
    obs.destroy();
  });

  it("detects replaceState with debug true", () => {
    const obs = new SPAObserver({ onRouteChange, debug: true });
    obs.start();
    history.replaceState({}, "", "/replace-debug-true");
    expect(onRouteChange).toHaveBeenCalled();
    obs.destroy();
  });

  it("skips text nodes in mutation handling for added nodes", async () => {
    observer.start();
    const callback = jest.fn();
    observer.onElementAdded(".text-test", callback);

    const textNode = document.createTextNode("hello");
    document.body.appendChild(textNode);

    await new Promise((r) => setTimeout(r, 50));

    expect(callback).not.toHaveBeenCalled();
  });

  it("skips text nodes in mutation handling for removed nodes", async () => {
    const textNode = document.createTextNode("hello");
    document.body.appendChild(textNode);

    observer.start();
    const callback = jest.fn();
    observer.onElementRemoved(".text-test", callback);

    document.body.removeChild(textNode);

    await new Promise((r) => setTimeout(r, 50));

    expect(callback).not.toHaveBeenCalled();
  });

  it("filters added subscriptions from removed subscriptions during mutations", async () => {
    observer.start();
    const addedCallback = jest.fn();
    const removedCallback = jest.fn();
    observer.onElementAdded(".mixed", addedCallback);
    observer.onElementRemoved(".mixed", removedCallback);

    const el = document.createElement("div");
    el.className = "mixed";
    document.body.appendChild(el);

    await new Promise((r) => setTimeout(r, 50));

    expect(addedCallback).toHaveBeenCalledWith(el);
    expect(removedCallback).not.toHaveBeenCalled();
  });

  it("filters removed subscriptions from added subscriptions during removal", async () => {
    const el = document.createElement("div");
    el.className = "mixed2";
    document.body.appendChild(el);

    observer.start();
    const addedCallback = jest.fn();
    const removedCallback = jest.fn();
    observer.onElementAdded(".mixed2", addedCallback);
    observer.onElementRemoved(".mixed2", removedCallback);

    addedCallback.mockClear(); // clear the initial scan match

    document.body.removeChild(el);

    await new Promise((r) => setTimeout(r, 50));

    expect(removedCallback).toHaveBeenCalledWith(el);
    expect(addedCallback).not.toHaveBeenCalled();
  });

  it("handles invalid selector in mutation observer for removed nodes with debug undefined", async () => {
    const obs = new SPAObserver({ onRouteChange, onDOMMutation });
    const el = document.createElement("div");
    document.body.appendChild(el);

    obs.start();
    const callback = jest.fn();
    const sub = {
      selector: "!!!invalid!!!",
      callback,
      type: "removed" as const,
    };
    (obs as any).subscriptions.push(sub);

    document.body.removeChild(el);

    await new Promise((r) => setTimeout(r, 50));

    expect(callback).not.toHaveBeenCalled();
    obs.destroy();
  });

  it("handles invalid selector in mutation observer for added nodes with debug undefined", async () => {
    const obs = new SPAObserver({ onRouteChange, onDOMMutation });
    obs.start();
    const callback = jest.fn();
    const sub = { selector: "!!!invalid!!!", callback, type: "added" as const };
    (obs as any).subscriptions.push(sub);

    const el = document.createElement("div");
    document.body.appendChild(el);

    await new Promise((r) => setTimeout(r, 50));

    expect(callback).not.toHaveBeenCalled();
    obs.destroy();
  });
});
