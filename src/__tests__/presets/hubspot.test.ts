import { definePreset } from "../../presets/index";
import { hubspotForms } from "../../presets/hubspot";
import type { Preset } from "../../core/types";

function createCtx() {
  const emitted: Array<{ event: string; props: Record<string, unknown> }> = [];
  let addedCallback: ((el: Element) => void) | null = null;

  const ctx = {
    emit: jest.fn((event: string, props: Record<string, unknown>) =>
      emitted.push({ event, props }),
    ),
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

  return { ctx, emitted, getAddedCallback: () => addedCallback };
}

function postHsFormCallback(
  eventName: string,
  formId: string,
  data?: Record<string, unknown>,
) {
  window.postMessage(
    { type: "hsFormCallback", id: formId, eventName, data: data || {} },
    "*",
  );
}

describe("definePreset", () => {
  it("returns the same object", () => {
    const preset: Preset = { rules: [] };
    expect(definePreset(preset)).toBe(preset);
  });
});

describe("hubspotForms", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

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
    const { ctx, emitted, getAddedCallback } = createCtx();

    const form = document.createElement("form");
    form.className = "hs-form";
    document.body.appendChild(form);

    preset.tracker!.init(ctx as any);
    getAddedCallback()!(form);

    form.dispatchEvent(new Event("focusin", { bubbles: true }));

    const startedEvents = emitted.filter((e) => e.event === "form_started");
    expect(startedEvents).toHaveLength(1);
    expect(startedEvents[0].props.form_type).toBe("hubspot");

    // Second focusin should not emit again
    form.dispatchEvent(new Event("focusin", { bubbles: true }));
    expect(emitted.filter((e) => e.event === "form_started")).toHaveLength(1);

    preset.tracker!.destroy();
    document.body.removeChild(form);
  });

  it("tracker emits form_submitted on HubSpot postMessage onFormSubmitted", async () => {
    const preset = hubspotForms();
    const { ctx, emitted, getAddedCallback } = createCtx();

    const form = document.createElement("form");
    form.className = "hs-form";
    form.id = "test-form-123";
    document.body.appendChild(form);

    preset.tracker!.init(ctx as any);
    getAddedCallback()!(form);

    postHsFormCallback("onFormSubmitted", "test-form-123", {
      formGuid: "guid-abc",
      conversionId: "conv-xyz",
    });

    // postMessage is async — wait a tick
    await new Promise((r) => setTimeout(r, 0));

    const submittedEvents = emitted.filter((e) => e.event === "form_submitted");
    expect(submittedEvents).toHaveLength(1);
    expect(submittedEvents[0].props.form_type).toBe("hubspot");
    expect(submittedEvents[0].props.form_id).toBe("guid-abc");
    expect(submittedEvents[0].props.conversion_id).toBe("conv-xyz");

    preset.tracker!.destroy();
    document.body.removeChild(form);
  });

  it("native submit does NOT emit form_submitted", () => {
    const preset = hubspotForms();
    const { ctx, emitted, getAddedCallback } = createCtx();

    const form = document.createElement("form");
    form.className = "hs-form";
    document.body.appendChild(form);

    preset.tracker!.init(ctx as any);
    getAddedCallback()!(form);

    form.dispatchEvent(new Event("submit", { bubbles: true }));

    const submittedEvents = emitted.filter((e) => e.event === "form_submitted");
    expect(submittedEvents).toHaveLength(0);

    preset.tracker!.destroy();
    document.body.removeChild(form);
  });

  it("onFormError does NOT emit form_submitted", async () => {
    const preset = hubspotForms();
    const { ctx, emitted } = createCtx();

    preset.tracker!.init(ctx as any);

    postHsFormCallback("onFormError", "test-form", {});
    postHsFormCallback("onFormFailedValidation", "test-form", {});

    await new Promise((r) => setTimeout(r, 0));

    const submittedEvents = emitted.filter((e) => e.event === "form_submitted");
    expect(submittedEvents).toHaveLength(0);

    preset.tracker!.destroy();
  });

  it("tracker emits form_abandoned after timeout", () => {
    jest.useFakeTimers();
    const preset = hubspotForms({ abandonment: { timeout: 5000 } });
    const { ctx, emitted, getAddedCallback } = createCtx();

    const form = document.createElement("form");
    form.className = "hs-form";
    document.body.appendChild(form);

    preset.tracker!.init(ctx as any);
    getAddedCallback()!(form);

    form.dispatchEvent(new Event("focusin", { bubbles: true }));
    jest.advanceTimersByTime(5000);

    const abandonedEvents = emitted.filter((e) => e.event === "form_abandoned");
    expect(abandonedEvents).toHaveLength(1);
    expect(abandonedEvents[0].props.form_type).toBe("hubspot");

    preset.tracker!.destroy();
    document.body.removeChild(form);
  });

  it("clears abandon timer on postMessage onFormSubmitted", async () => {
    jest.useFakeTimers();
    const preset = hubspotForms({ abandonment: { timeout: 5000 } });
    const { ctx, emitted, getAddedCallback } = createCtx();

    const form = document.createElement("form");
    form.className = "hs-form";
    form.id = "abandon-test";
    document.body.appendChild(form);

    preset.tracker!.init(ctx as any);
    getAddedCallback()!(form);

    form.dispatchEvent(new Event("focusin", { bubbles: true }));

    postHsFormCallback("onFormSubmitted", "abandon-test", {
      formGuid: "abandon-test",
      conversionId: "c-1",
    });
    await jest.advanceTimersByTimeAsync(0);

    jest.advanceTimersByTime(5000);

    const abandonedEvents = emitted.filter((e) => e.event === "form_abandoned");
    expect(abandonedEvents).toHaveLength(0);

    preset.tracker!.destroy();
    document.body.removeChild(form);
  });

  it("does not emit form_started after submission on focusin", async () => {
    const preset = hubspotForms();
    const { ctx, emitted, getAddedCallback } = createCtx();

    const form = document.createElement("form");
    form.className = "hs-form";
    form.id = "resubmit-test";
    document.body.appendChild(form);

    preset.tracker!.init(ctx as any);
    getAddedCallback()!(form);

    form.dispatchEvent(new Event("focusin", { bubbles: true }));

    postHsFormCallback("onFormSubmitted", "resubmit-test", {
      formGuid: "resubmit-test",
      conversionId: "c-2",
    });
    await new Promise((r) => setTimeout(r, 0));

    const countBefore = emitted.filter(
      (e) => e.event === "form_started",
    ).length;

    form.dispatchEvent(new Event("focusin", { bubbles: true }));

    const countAfter = emitted.filter((e) => e.event === "form_started").length;
    expect(countAfter).toBe(countBefore);

    preset.tracker!.destroy();
    document.body.removeChild(form);
  });

  it("destroy removes the message listener", async () => {
    const preset = hubspotForms();
    const { ctx, emitted } = createCtx();

    preset.tracker!.init(ctx as any);
    preset.tracker!.destroy();

    postHsFormCallback("onFormSubmitted", "destroyed-test", {
      formGuid: "destroyed-test",
      conversionId: "c-3",
    });
    await new Promise((r) => setTimeout(r, 0));

    const submittedEvents = emitted.filter((e) => e.event === "form_submitted");
    expect(submittedEvents).toHaveLength(0);
  });

  it("destroy does not throw when called multiple times", () => {
    const preset = hubspotForms();
    const { ctx } = createCtx();
    preset.tracker!.init(ctx as any);
    expect(() => preset.tracker!.destroy()).not.toThrow();
    expect(() => preset.tracker!.destroy()).not.toThrow();
  });

  it("ignores messages with no data", async () => {
    const preset = hubspotForms();
    const { ctx, emitted } = createCtx();
    preset.tracker!.init(ctx as any);

    window.postMessage(null, "*");
    window.postMessage(undefined, "*");
    await new Promise((r) => setTimeout(r, 0));

    expect(emitted).toHaveLength(0);
    preset.tracker!.destroy();
  });

  it("ignores messages with non-hsFormCallback type", async () => {
    const preset = hubspotForms();
    const { ctx, emitted } = createCtx();
    preset.tracker!.init(ctx as any);

    window.postMessage({ type: "other", eventName: "onFormSubmitted" }, "*");
    await new Promise((r) => setTimeout(r, 0));

    expect(emitted).toHaveLength(0);
    preset.tracker!.destroy();
  });

  it("handles submit message without formGuid or conversionId", async () => {
    const preset = hubspotForms();
    const { ctx, emitted } = createCtx();
    preset.tracker!.init(ctx as any);

    postHsFormCallback("onFormSubmitted", "fallback-form", {});
    await new Promise((r) => setTimeout(r, 0));

    const submitted = emitted.filter((e) => e.event === "form_submitted");
    expect(submitted).toHaveLength(1);
    expect(submitted[0].props.form_id).toBe("fallback-form");
    expect(submitted[0].props.conversion_id).toBe("");

    preset.tracker!.destroy();
  });

  it("handles submit message without id", async () => {
    const preset = hubspotForms();
    const { ctx, emitted } = createCtx();
    preset.tracker!.init(ctx as any);

    window.postMessage(
      {
        type: "hsFormCallback",
        eventName: "onFormSubmitted",
        data: { formGuid: "g-1" },
      },
      "*",
    );
    await new Promise((r) => setTimeout(r, 0));

    const submitted = emitted.filter((e) => e.event === "form_submitted");
    expect(submitted).toHaveLength(1);
    expect(submitted[0].props.form_id).toBe("g-1");

    preset.tracker!.destroy();
  });

  it("handles submit message with no data property", async () => {
    const preset = hubspotForms();
    const { ctx, emitted } = createCtx();
    preset.tracker!.init(ctx as any);

    window.postMessage(
      {
        type: "hsFormCallback",
        id: "no-data-form",
        eventName: "onFormSubmitted",
      },
      "*",
    );
    await new Promise((r) => setTimeout(r, 0));

    const submitted = emitted.filter((e) => e.event === "form_submitted");
    expect(submitted).toHaveLength(1);
    expect(submitted[0].props.form_id).toBe("no-data-form");
    expect(submitted[0].props.conversion_id).toBe("");

    preset.tracker!.destroy();
  });

  it("derives form ID from data-form-id attribute", () => {
    const preset = hubspotForms();
    const { ctx, emitted, getAddedCallback } = createCtx();

    const form = document.createElement("form");
    form.className = "hs-form";
    form.setAttribute("data-form-id", "attr-form-id");
    form.id = "should-not-use-this";
    document.body.appendChild(form);

    preset.tracker!.init(ctx as any);
    getAddedCallback()!(form);

    form.dispatchEvent(new Event("focusin", { bubbles: true }));

    const started = emitted.filter((e) => e.event === "form_started");
    expect(started[0].props.form_id).toBe("attr-form-id");

    preset.tracker!.destroy();
    document.body.removeChild(form);
  });

  it("derives form ID from hs_form_id hidden input", () => {
    const preset = hubspotForms();
    const { ctx, emitted, getAddedCallback } = createCtx();

    const form = document.createElement("form");
    form.className = "hs-form";
    const hidden = document.createElement("input");
    hidden.type = "hidden";
    hidden.name = "hs_form_id";
    hidden.value = "hidden-input-id";
    form.appendChild(hidden);
    document.body.appendChild(form);

    preset.tracker!.init(ctx as any);
    getAddedCallback()!(form);

    form.dispatchEvent(new Event("focusin", { bubbles: true }));

    const started = emitted.filter((e) => e.event === "form_started");
    expect(started[0].props.form_id).toBe("hidden-input-id");

    preset.tracker!.destroy();
    document.body.removeChild(form);
  });

  it("returns empty string form ID when form has no identifiers", () => {
    const preset = hubspotForms();
    const { ctx, emitted, getAddedCallback } = createCtx();

    const form = document.createElement("form");
    form.className = "hs-form";
    document.body.appendChild(form);

    preset.tracker!.init(ctx as any);
    getAddedCallback()!(form);

    form.dispatchEvent(new Event("focusin", { bubbles: true }));

    const started = emitted.filter((e) => e.event === "form_started");
    expect(started[0].props.form_id).toBe("");

    preset.tracker!.destroy();
    document.body.removeChild(form);
  });
});
