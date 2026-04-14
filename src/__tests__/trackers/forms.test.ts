import { formTracker } from "../../trackers/forms";
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

function createForm(attrs?: {
  id?: string;
  name?: string;
  absFormId?: string;
  action?: string;
}): HTMLFormElement {
  const form = document.createElement("form");
  if (attrs?.id) form.id = attrs.id;
  if (attrs?.name) form.name = attrs.name;
  if (attrs?.absFormId) form.dataset.absFormId = attrs.absFormId;
  if (attrs?.action) form.action = attrs.action;
  document.body.appendChild(form);
  return form;
}

function addInput(
  form: HTMLFormElement,
  name: string,
  value?: string,
): HTMLInputElement {
  const input = document.createElement("input");
  input.name = name;
  if (value !== undefined) input.value = value;
  form.appendChild(input);
  return input;
}

function focusInput(input: HTMLInputElement): void {
  const event = new Event("focusin", { bubbles: true });
  Object.defineProperty(event, "target", { value: input, configurable: true });
  document.dispatchEvent(event);
}

function submitForm(form: HTMLFormElement): void {
  const event = new Event("submit", { bubbles: true });
  Object.defineProperty(event, "target", { value: form, configurable: true });
  document.dispatchEvent(event);
}

describe("formTracker", () => {
  let forms: HTMLFormElement[] = [];

  beforeEach(() => {
    jest.useFakeTimers();
    forms = [];
  });

  afterEach(() => {
    for (const form of forms) {
      if (form.parentNode) form.parentNode.removeChild(form);
    }
    jest.useRealTimers();
  });

  function makeForm(attrs?: Parameters<typeof createForm>[0]): HTMLFormElement {
    const form = createForm(attrs);
    forms.push(form);
    return form;
  }

  it("has correct name", () => {
    expect(formTracker().name).toBe("form-tracker");
  });

  it("emits form_started on focus", () => {
    const tracker = formTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    const form = makeForm({ id: "contact" });
    const input = addInput(form, "email");
    focusInput(input);

    expect(ctx.emit).toHaveBeenCalledWith("form_started", {
      form_id: "contact",
      form_action: expect.anything(),
      page_name: "home",
    });

    tracker.destroy();
  });

  it("emits form_started only once per form", () => {
    const tracker = formTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    const form = makeForm({ id: "contact" });
    const input1 = addInput(form, "email");
    const input2 = addInput(form, "name");

    focusInput(input1);
    focusInput(input2);

    const startedCalls = (ctx.emit as jest.Mock).mock.calls.filter(
      ([event]) => event === "form_started",
    );
    expect(startedCalls.length).toBe(1);

    tracker.destroy();
  });

  it("emits form_submitted on submit", () => {
    const tracker = formTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    const form = makeForm({ id: "contact" });
    const input = addInput(form, "email");
    focusInput(input);
    submitForm(form);

    expect(ctx.emit).toHaveBeenCalledWith("form_submitted", {
      form_id: "contact",
      form_action: expect.anything(),
      page_name: "home",
    });

    tracker.destroy();
  });

  it("uses data-abs-form-id for form_id", () => {
    const tracker = formTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    const form = makeForm({ id: "native-id", absFormId: "custom-id" });
    const input = addInput(form, "email");
    focusInput(input);

    expect(ctx.emit).toHaveBeenCalledWith(
      "form_started",
      expect.objectContaining({ form_id: "custom-id" }),
    );

    tracker.destroy();
  });

  it("emits form_abandoned after timeout", () => {
    const tracker = formTracker({ abandonment: { timeout: 5000 } });
    const ctx = createMockContext();
    tracker.init(ctx);

    const form = makeForm({ id: "contact" });
    const input = addInput(form, "email");
    focusInput(input);

    jest.advanceTimersByTime(5000);

    expect(ctx.emit).toHaveBeenCalledWith(
      "form_abandoned",
      expect.objectContaining({ form_id: "contact" }),
    );

    tracker.destroy();
  });

  it("emits form_abandoned on route change for started-not-submitted forms", () => {
    const tracker = formTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    const form = makeForm({ id: "contact" });
    const input = addInput(form, "email");
    focusInput(input);

    tracker.onRouteChange!("/new", "/old");

    expect(ctx.emit).toHaveBeenCalledWith(
      "form_abandoned",
      expect.objectContaining({ form_id: "contact" }),
    );

    tracker.destroy();
  });

  it("does not emit form_abandoned if form was submitted", () => {
    const tracker = formTracker({ abandonment: { timeout: 5000 } });
    const ctx = createMockContext();
    tracker.init(ctx);

    const form = makeForm({ id: "contact" });
    const input = addInput(form, "email");
    focusInput(input);
    submitForm(form);

    jest.advanceTimersByTime(5000);

    const abandonCalls = (ctx.emit as jest.Mock).mock.calls.filter(
      ([event]) => event === "form_abandoned",
    );
    expect(abandonCalls.length).toBe(0);

    tracker.destroy();
  });

  it("does not emit form_abandoned on route change if form was submitted", () => {
    const tracker = formTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    const form = makeForm({ id: "contact" });
    const input = addInput(form, "email");
    focusInput(input);
    submitForm(form);

    tracker.onRouteChange!("/new", "/old");

    const abandonCalls = (ctx.emit as jest.Mock).mock.calls.filter(
      ([event]) => event === "form_abandoned",
    );
    expect(abandonCalls.length).toBe(0);

    tracker.destroy();
  });

  it("removes listeners on destroy", () => {
    const tracker = formTracker();
    const ctx = createMockContext();
    tracker.init(ctx);
    tracker.destroy();

    const form = makeForm({ id: "contact" });
    const input = addInput(form, "email");
    focusInput(input);

    expect(ctx.emit).not.toHaveBeenCalled();
  });

  it("clears abandon timer on destroy", () => {
    const tracker = formTracker({ abandonment: { timeout: 5000 } });
    const ctx = createMockContext();
    tracker.init(ctx);

    const form = makeForm({ id: "contact" });
    const input = addInput(form, "email");
    focusInput(input);

    tracker.destroy();

    jest.advanceTimersByTime(5000);

    const abandonCalls = (ctx.emit as jest.Mock).mock.calls.filter(
      ([event]) => event === "form_abandoned",
    );
    expect(abandonCalls.length).toBe(0);
  });

  it("counts only fields with non-empty non-whitespace values in form_abandoned", () => {
    const tracker = formTracker({ abandonment: { timeout: 5000 } });
    const ctx = createMockContext();
    tracker.init(ctx);

    const form = makeForm({ id: "contact" });
    const filled = addInput(form, "email", "test@example.com");
    addInput(form, "name", "");
    addInput(form, "phone", "   ");

    focusInput(filled);

    jest.advanceTimersByTime(5000);

    expect(ctx.emit).toHaveBeenCalledWith(
      "form_abandoned",
      expect.objectContaining({ fields_completed: 1 }),
    );

    tracker.destroy();
  });

  it("does not start form when focus target is not inside a form", () => {
    const tracker = formTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    const input = document.createElement("input");
    input.name = "standalone";
    document.body.appendChild(input);

    const event = new Event("focusin", { bubbles: true });
    Object.defineProperty(event, "target", {
      value: input,
      configurable: true,
    });
    document.dispatchEvent(event);

    expect(ctx.emit).not.toHaveBeenCalled();

    tracker.destroy();
    document.body.removeChild(input);
  });

  it("does not restart form tracking after submission", () => {
    const tracker = formTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    const form = makeForm({ id: "contact" });
    const input = addInput(form, "email");
    focusInput(input);
    submitForm(form);

    (ctx.emit as jest.Mock).mockClear();

    focusInput(input);

    expect(ctx.emit).not.toHaveBeenCalledWith(
      "form_started",
      expect.anything(),
    );

    tracker.destroy();
  });

  it("derives form_id from form name when no id or data-abs-form-id", () => {
    const tracker = formTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    const form = makeForm({ name: "newsletter" });
    const input = addInput(form, "email");
    focusInput(input);

    expect(ctx.emit).toHaveBeenCalledWith(
      "form_started",
      expect.objectContaining({ form_id: "newsletter" }),
    );

    tracker.destroy();
  });

  it("generates form_id when form has no id, name, or data-abs-form-id", () => {
    const tracker = formTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    const form = makeForm();
    const input = addInput(form, "email");
    focusInput(input);

    expect(ctx.emit).toHaveBeenCalledWith(
      "form_started",
      expect.objectContaining({ form_id: expect.any(String) }),
    );

    tracker.destroy();
  });

  it("does not emit on focusin with null event target", () => {
    const tracker = formTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    const event = new Event("focusin", { bubbles: true });
    Object.defineProperty(event, "target", { value: null, configurable: true });
    document.dispatchEvent(event);

    expect(ctx.emit).not.toHaveBeenCalled();

    tracker.destroy();
  });

  it("does not emit on submit with null event target", () => {
    const tracker = formTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    const event = new Event("submit", { bubbles: true });
    Object.defineProperty(event, "target", { value: null, configurable: true });
    document.dispatchEvent(event);

    expect(ctx.emit).not.toHaveBeenCalled();

    tracker.destroy();
  });

  it("tracks lastField using input id when name is empty", () => {
    const tracker = formTracker({ abandonment: { timeout: 5000 } });
    const ctx = createMockContext();
    tracker.init(ctx);

    const form = makeForm({ id: "contact" });
    const input = document.createElement("input");
    input.id = "email-field";
    form.appendChild(input);

    focusInput(input as HTMLInputElement);

    jest.advanceTimersByTime(5000);

    expect(ctx.emit).toHaveBeenCalledWith(
      "form_abandoned",
      expect.objectContaining({ last_field: "email-field" }),
    );

    tracker.destroy();
  });

  it("sets lastField to null when input has no name or id", () => {
    const tracker = formTracker({ abandonment: { timeout: 5000 } });
    const ctx = createMockContext();
    tracker.init(ctx);

    const form = makeForm({ id: "contact" });
    const input = document.createElement("input");
    form.appendChild(input);

    focusInput(input as HTMLInputElement);

    jest.advanceTimersByTime(5000);

    expect(ctx.emit).toHaveBeenCalledWith(
      "form_abandoned",
      expect.objectContaining({ last_field: null }),
    );

    tracker.destroy();
  });

  it("resets abandon timer on subsequent focus events", () => {
    const tracker = formTracker({ abandonment: { timeout: 5000 } });
    const ctx = createMockContext();
    tracker.init(ctx);

    const form = makeForm({ id: "contact" });
    const input1 = addInput(form, "email");
    const input2 = addInput(form, "name");

    focusInput(input1);
    jest.advanceTimersByTime(3000);

    focusInput(input2);
    jest.advanceTimersByTime(3000);

    // Only 3 seconds since last focus, not 5
    const abandonCalls = (ctx.emit as jest.Mock).mock.calls.filter(
      ([event]) => event === "form_abandoned",
    );
    expect(abandonCalls.length).toBe(0);

    jest.advanceTimersByTime(2000);
    const abandonCalls2 = (ctx.emit as jest.Mock).mock.calls.filter(
      ([event]) => event === "form_abandoned",
    );
    expect(abandonCalls2.length).toBe(1);

    tracker.destroy();
  });

  it("reports form_action as null when form has no action", () => {
    const tracker = formTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    const form = makeForm({ id: "no-action" });
    // Force form.action to be empty to cover the || null branch
    Object.defineProperty(form, "action", { value: "", configurable: true });
    const input = addInput(form, "email");
    focusInput(input);

    expect(ctx.emit).toHaveBeenCalledWith(
      "form_started",
      expect.objectContaining({ form_action: null }),
    );

    submitForm(form);

    expect(ctx.emit).toHaveBeenCalledWith(
      "form_submitted",
      expect.objectContaining({ form_action: null }),
    );

    tracker.destroy();
  });

  it("does not emit form_abandoned on route change for unstarted forms", () => {
    const tracker = formTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    // Create a form but don't focus any field (unstarted)
    makeForm({ id: "unstarted" });

    tracker.onRouteChange!("/new", "/old");

    expect(ctx.emit).not.toHaveBeenCalledWith(
      "form_abandoned",
      expect.anything(),
    );

    tracker.destroy();
  });
});
