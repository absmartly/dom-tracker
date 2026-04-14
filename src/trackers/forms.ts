import { Tracker, TrackerContext } from "../core/types";
import { generateId } from "../utils/cookies";

export interface FormTrackerConfig {
  abandonment?: {
    timeout: number;
  };
}

interface FormState {
  formId: string;
  started: boolean;
  submitted: boolean;
  abandonTimer: ReturnType<typeof setTimeout> | null;
  lastField: string | null;
}

function deriveFormId(form: HTMLFormElement): string {
  return form.dataset.absFormId || form.id || form.name || generateId();
}

function countFilledFields(form: HTMLFormElement): number {
  const inputs = form.querySelectorAll("input, textarea, select");
  let count = 0;
  for (const input of Array.from(inputs)) {
    const el = input as
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement;
    if (el.value && el.value.trim() !== "") {
      count++;
    }
  }
  return count;
}

export function formTracker(config?: FormTrackerConfig): Tracker {
  let ctx: TrackerContext | null = null;
  const formStates = new Map<HTMLFormElement, FormState>();

  function getOrCreateState(form: HTMLFormElement): FormState {
    if (!formStates.has(form)) {
      formStates.set(form, {
        formId: deriveFormId(form),
        started: false,
        submitted: false,
        abandonTimer: null,
        lastField: null,
      });
    }
    return formStates.get(form)!;
  }

  function fireAbandonment(form: HTMLFormElement, state: FormState): void {
    /* istanbul ignore if -- defensive guard; callers check ctx before invoking */
    if (!ctx) return;
    ctx.emit("form_abandoned", {
      form_id: state.formId,
      fields_completed: countFilledFields(form),
      last_field: state.lastField,
      page_name: ctx.getPageName(),
    });
  }

  function clearAbandonTimer(state: FormState): void {
    if (state.abandonTimer !== null) {
      clearTimeout(state.abandonTimer);
      state.abandonTimer = null;
    }
  }

  function startAbandonTimer(form: HTMLFormElement, state: FormState): void {
    if (!config?.abandonment) return;
    clearAbandonTimer(state);
    state.abandonTimer = setTimeout(() => {
      if (!state.submitted) {
        fireAbandonment(form, state);
      }
    }, config.abandonment.timeout);
  }

  function onFocusIn(event: Event): void {
    /* istanbul ignore if -- defensive guard; destroy() removes listener before nulling ctx */
    if (!ctx) return;
    const target = event.target as Element | null;
    if (!target) return;
    const form = target.closest("form") as HTMLFormElement | null;
    if (!form) return;

    const state = getOrCreateState(form);
    const fieldName =
      (target as HTMLInputElement).name ||
      (target as HTMLInputElement).id ||
      "";
    state.lastField = fieldName || null;

    if (state.submitted) return;

    if (!state.started) {
      state.started = true;
      ctx.emit("form_started", {
        form_id: state.formId,
        form_action: form.action || null,
        page_name: ctx.getPageName(),
      });
    }

    startAbandonTimer(form, state);
  }

  function onSubmit(event: Event): void {
    /* istanbul ignore if -- defensive guard; destroy() removes listener before nulling ctx */
    if (!ctx) return;
    const form = event.target as HTMLFormElement | null;
    if (!form) return;

    const state = getOrCreateState(form);
    clearAbandonTimer(state);
    state.submitted = true;

    ctx.emit("form_submitted", {
      form_id: state.formId,
      form_action: form.action || null,
      page_name: ctx.getPageName(),
    });
  }

  function clearAllStates(): void {
    for (const [form, state] of formStates.entries()) {
      clearAbandonTimer(state);
      if (state.started && !state.submitted && ctx) {
        fireAbandonment(form, state);
      }
    }
    formStates.clear();
  }

  return {
    name: "form-tracker",

    init(context: TrackerContext): void {
      ctx = context;
      document.addEventListener("focusin", onFocusIn);
      document.addEventListener("submit", onSubmit);
    },

    onRouteChange(): void {
      clearAllStates();
    },

    destroy(): void {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("submit", onSubmit);
      for (const [, state] of formStates.entries()) {
        clearAbandonTimer(state);
      }
      formStates.clear();
      ctx = null;
    },
  };
}
