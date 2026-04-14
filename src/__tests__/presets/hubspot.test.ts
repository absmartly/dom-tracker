import { definePreset } from "../../presets/index";
import { hubspotForms } from "../../presets/hubspot";
import type { Preset } from "../../core/types";

describe("definePreset", () => {
  it("returns the same object", () => {
    const preset: Preset = { rules: [] };
    expect(definePreset(preset)).toBe(preset);
  });
});

describe("hubspotForms", () => {
  it("returns a preset with tracker named hubspot-forms", () => {
    const preset = hubspotForms();
    expect(preset.tracker).toBeDefined();
    expect(preset.tracker!.name).toBe("hubspot-forms");
  });

  it("includes rules targeting .hs-input", () => {
    const preset = hubspotForms();
    expect(preset.rules.length).toBeGreaterThan(0);
    const hsInputRule = preset.rules.find((r) => r.selector === ".hs-input");
    expect(hsInputRule).toBeDefined();
  });

  it("rule targets focus event on .hs-input", () => {
    const preset = hubspotForms();
    const rule = preset.rules.find((r) => r.selector === ".hs-input");
    expect(rule?.event).toBe("form_field_focused");
    expect(rule?.on).toBe("focus");
  });

  it("tracker emits form_started on first focusin to form", () => {
    const preset = hubspotForms();

    const form = document.createElement("form");
    form.className = "hs-form";
    document.body.appendChild(form);

    const emitted: Array<{ event: string; props: Record<string, unknown> }> =
      [];
    let addedCallback: ((el: Element) => void) | null = null;

    const ctx = {
      emit: jest.fn((event, props) => emitted.push({ event, props })),
      setAttributes: jest.fn(),
      getConfig: jest.fn(() => ({})),
      querySelectorAll: jest.fn(() => []),
      onElementAdded: jest.fn((_sel: string, cb: (el: Element) => void) => {
        addedCallback = cb;
        return () => {};
      }),
      onElementRemoved: jest.fn(() => () => {}),
      getPageName: jest.fn(() => "Home"),
    };

    preset.tracker!.init(ctx as any);
    expect(addedCallback).not.toBeNull();

    addedCallback!(form);

    form.dispatchEvent(new Event("focusin", { bubbles: true }));

    const startedEvents = emitted.filter((e) => e.event === "form_started");
    expect(startedEvents).toHaveLength(1);
    expect(startedEvents[0].props.form_type).toBe("hubspot");

    form.dispatchEvent(new Event("focusin", { bubbles: true }));
    expect(emitted.filter((e) => e.event === "form_started")).toHaveLength(1);

    document.body.removeChild(form);
  });

  it("tracker emits form_submitted on submit", () => {
    const preset = hubspotForms();

    const form = document.createElement("form");
    form.className = "hs-form";
    document.body.appendChild(form);

    const emitted: Array<{ event: string; props: Record<string, unknown> }> =
      [];
    let addedCallback: ((el: Element) => void) | null = null;

    const ctx = {
      emit: jest.fn((event, props) => emitted.push({ event, props })),
      setAttributes: jest.fn(),
      getConfig: jest.fn(() => ({})),
      querySelectorAll: jest.fn(() => []),
      onElementAdded: jest.fn((_sel: string, cb: (el: Element) => void) => {
        addedCallback = cb;
        return () => {};
      }),
      onElementRemoved: jest.fn(() => () => {}),
      getPageName: jest.fn(() => "Home"),
    };

    preset.tracker!.init(ctx as any);
    addedCallback!(form);

    form.dispatchEvent(new Event("focusin", { bubbles: true }));
    form.dispatchEvent(new Event("submit", { bubbles: true }));

    const submittedEvents = emitted.filter((e) => e.event === "form_submitted");
    expect(submittedEvents).toHaveLength(1);
    expect(submittedEvents[0].props.form_type).toBe("hubspot");

    document.body.removeChild(form);
  });

  it("tracker emits form_abandoned after timeout", () => {
    jest.useFakeTimers();
    const preset = hubspotForms({ abandonment: { timeout: 5000 } });

    const form = document.createElement("form");
    form.className = "hs-form";
    document.body.appendChild(form);

    const emitted: Array<{ event: string; props: Record<string, unknown> }> =
      [];
    let addedCallback: ((el: Element) => void) | null = null;

    const ctx = {
      emit: jest.fn((event, props) => emitted.push({ event, props })),
      setAttributes: jest.fn(),
      getConfig: jest.fn(() => ({})),
      querySelectorAll: jest.fn(() => []),
      onElementAdded: jest.fn((_sel: string, cb: (el: Element) => void) => {
        addedCallback = cb;
        return () => {};
      }),
      onElementRemoved: jest.fn(() => () => {}),
      getPageName: jest.fn(() => "Home"),
    };

    preset.tracker!.init(ctx as any);
    addedCallback!(form);

    form.dispatchEvent(new Event("focusin", { bubbles: true }));
    jest.advanceTimersByTime(5000);

    const abandonedEvents = emitted.filter((e) => e.event === "form_abandoned");
    expect(abandonedEvents).toHaveLength(1);
    expect(abandonedEvents[0].props.form_type).toBe("hubspot");

    document.body.removeChild(form);
    jest.useRealTimers();
  });

  it("clears abandon timer on submit", () => {
    jest.useFakeTimers();
    const preset = hubspotForms({ abandonment: { timeout: 5000 } });

    const form = document.createElement("form");
    form.className = "hs-form";
    document.body.appendChild(form);

    const emitted: Array<{ event: string; props: Record<string, unknown> }> =
      [];
    let addedCallback: ((el: Element) => void) | null = null;

    const ctx = {
      emit: jest.fn((event, props) => emitted.push({ event, props })),
      setAttributes: jest.fn(),
      getConfig: jest.fn(() => ({})),
      querySelectorAll: jest.fn(() => []),
      onElementAdded: jest.fn((_sel: string, cb: (el: Element) => void) => {
        addedCallback = cb;
        return () => {};
      }),
      onElementRemoved: jest.fn(() => () => {}),
      getPageName: jest.fn(() => "Home"),
    };

    preset.tracker!.init(ctx as any);
    addedCallback!(form);

    form.dispatchEvent(new Event("focusin", { bubbles: true }));
    form.dispatchEvent(new Event("submit", { bubbles: true }));

    jest.advanceTimersByTime(5000);

    const abandonedEvents = emitted.filter((e) => e.event === "form_abandoned");
    expect(abandonedEvents).toHaveLength(0);

    document.body.removeChild(form);
    jest.useRealTimers();
  });

  it("does not emit form_started after submission on focusin", () => {
    const preset = hubspotForms();

    const form = document.createElement("form");
    form.className = "hs-form";
    document.body.appendChild(form);

    const emitted: Array<{ event: string; props: Record<string, unknown> }> =
      [];
    let addedCallback: ((el: Element) => void) | null = null;

    const ctx = {
      emit: jest.fn((event, props) => emitted.push({ event, props })),
      setAttributes: jest.fn(),
      getConfig: jest.fn(() => ({})),
      querySelectorAll: jest.fn(() => []),
      onElementAdded: jest.fn((_sel: string, cb: (el: Element) => void) => {
        addedCallback = cb;
        return () => {};
      }),
      onElementRemoved: jest.fn(() => () => {}),
      getPageName: jest.fn(() => "Home"),
    };

    preset.tracker!.init(ctx as any);
    addedCallback!(form);

    form.dispatchEvent(new Event("focusin", { bubbles: true }));
    form.dispatchEvent(new Event("submit", { bubbles: true }));

    const countBefore = emitted.filter(
      (e) => e.event === "form_started",
    ).length;

    form.dispatchEvent(new Event("focusin", { bubbles: true }));

    const countAfter = emitted.filter((e) => e.event === "form_started").length;
    expect(countAfter).toBe(countBefore);

    document.body.removeChild(form);
  });

  it("destroy does not throw", () => {
    const preset = hubspotForms();
    expect(() => preset.tracker!.destroy()).not.toThrow();
  });
});
