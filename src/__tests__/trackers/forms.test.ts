import { formTracker } from '../../trackers/forms';
import { TrackerContext } from '../../core/types';

function createMockContext(overrides?: Partial<TrackerContext>): TrackerContext {
  return {
    emit: jest.fn(),
    setAttributes: jest.fn(),
    getConfig: jest.fn(),
    querySelectorAll: jest.fn(),
    onElementAdded: jest.fn(),
    onElementRemoved: jest.fn(),
    getPageName: jest.fn().mockReturnValue('home'),
    ...overrides,
  };
}

function createForm(attrs?: {
  id?: string;
  name?: string;
  absFormId?: string;
  action?: string;
}): HTMLFormElement {
  const form = document.createElement('form');
  if (attrs?.id) form.id = attrs.id;
  if (attrs?.name) form.name = attrs.name;
  if (attrs?.absFormId) form.dataset.absFormId = attrs.absFormId;
  if (attrs?.action) form.action = attrs.action;
  document.body.appendChild(form);
  return form;
}

function addInput(form: HTMLFormElement, name: string, value?: string): HTMLInputElement {
  const input = document.createElement('input');
  input.name = name;
  if (value !== undefined) input.value = value;
  form.appendChild(input);
  return input;
}

function focusInput(input: HTMLInputElement): void {
  const event = new Event('focusin', { bubbles: true });
  Object.defineProperty(event, 'target', { value: input, configurable: true });
  document.dispatchEvent(event);
}

function submitForm(form: HTMLFormElement): void {
  const event = new Event('submit', { bubbles: true });
  Object.defineProperty(event, 'target', { value: form, configurable: true });
  document.dispatchEvent(event);
}

describe('formTracker', () => {
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

  it('has correct name', () => {
    expect(formTracker().name).toBe('form-tracker');
  });

  it('emits form_started on focus', () => {
    const tracker = formTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    const form = makeForm({ id: 'contact' });
    const input = addInput(form, 'email');
    focusInput(input);

    expect(ctx.emit).toHaveBeenCalledWith('form_started', {
      form_id: 'contact',
      form_action: expect.anything(),
      page_name: 'home',
    });

    tracker.destroy();
  });

  it('emits form_started only once per form', () => {
    const tracker = formTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    const form = makeForm({ id: 'contact' });
    const input1 = addInput(form, 'email');
    const input2 = addInput(form, 'name');

    focusInput(input1);
    focusInput(input2);

    const startedCalls = (ctx.emit as jest.Mock).mock.calls.filter(([event]) => event === 'form_started');
    expect(startedCalls.length).toBe(1);

    tracker.destroy();
  });

  it('emits form_submitted on submit', () => {
    const tracker = formTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    const form = makeForm({ id: 'contact' });
    const input = addInput(form, 'email');
    focusInput(input);
    submitForm(form);

    expect(ctx.emit).toHaveBeenCalledWith('form_submitted', {
      form_id: 'contact',
      form_action: expect.anything(),
      page_name: 'home',
    });

    tracker.destroy();
  });

  it('uses data-abs-form-id for form_id', () => {
    const tracker = formTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    const form = makeForm({ id: 'native-id', absFormId: 'custom-id' });
    const input = addInput(form, 'email');
    focusInput(input);

    expect(ctx.emit).toHaveBeenCalledWith('form_started', expect.objectContaining({ form_id: 'custom-id' }));

    tracker.destroy();
  });

  it('emits form_abandoned after timeout', () => {
    const tracker = formTracker({ abandonment: { timeout: 5000 } });
    const ctx = createMockContext();
    tracker.init(ctx);

    const form = makeForm({ id: 'contact' });
    const input = addInput(form, 'email');
    focusInput(input);

    jest.advanceTimersByTime(5000);

    expect(ctx.emit).toHaveBeenCalledWith('form_abandoned', expect.objectContaining({ form_id: 'contact' }));

    tracker.destroy();
  });

  it('emits form_abandoned on route change for started-not-submitted forms', () => {
    const tracker = formTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    const form = makeForm({ id: 'contact' });
    const input = addInput(form, 'email');
    focusInput(input);

    tracker.onRouteChange!('/new', '/old');

    expect(ctx.emit).toHaveBeenCalledWith('form_abandoned', expect.objectContaining({ form_id: 'contact' }));

    tracker.destroy();
  });

  it('does not emit form_abandoned if form was submitted', () => {
    const tracker = formTracker({ abandonment: { timeout: 5000 } });
    const ctx = createMockContext();
    tracker.init(ctx);

    const form = makeForm({ id: 'contact' });
    const input = addInput(form, 'email');
    focusInput(input);
    submitForm(form);

    jest.advanceTimersByTime(5000);

    const abandonCalls = (ctx.emit as jest.Mock).mock.calls.filter(([event]) => event === 'form_abandoned');
    expect(abandonCalls.length).toBe(0);

    tracker.destroy();
  });

  it('does not emit form_abandoned on route change if form was submitted', () => {
    const tracker = formTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    const form = makeForm({ id: 'contact' });
    const input = addInput(form, 'email');
    focusInput(input);
    submitForm(form);

    tracker.onRouteChange!('/new', '/old');

    const abandonCalls = (ctx.emit as jest.Mock).mock.calls.filter(([event]) => event === 'form_abandoned');
    expect(abandonCalls.length).toBe(0);

    tracker.destroy();
  });

  it('removes listeners on destroy', () => {
    const tracker = formTracker();
    const ctx = createMockContext();
    tracker.init(ctx);
    tracker.destroy();

    const form = makeForm({ id: 'contact' });
    const input = addInput(form, 'email');
    focusInput(input);

    expect(ctx.emit).not.toHaveBeenCalled();
  });

  it('clears abandon timer on destroy', () => {
    const tracker = formTracker({ abandonment: { timeout: 5000 } });
    const ctx = createMockContext();
    tracker.init(ctx);

    const form = makeForm({ id: 'contact' });
    const input = addInput(form, 'email');
    focusInput(input);

    tracker.destroy();

    jest.advanceTimersByTime(5000);

    const abandonCalls = (ctx.emit as jest.Mock).mock.calls.filter(([event]) => event === 'form_abandoned');
    expect(abandonCalls.length).toBe(0);
  });
});
