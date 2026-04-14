import type { Preset, TrackerContext } from "../core/types";

export interface HubSpotFormsConfig {
  abandonment?: {
    timeout: number;
  };
}

interface HsFormState {
  started: boolean;
  submitted: boolean;
  abandonTimer: ReturnType<typeof setTimeout> | null;
}

export function hubspotForms(config?: HubSpotFormsConfig): Preset {
  return {
    rules: [
      { selector: ".hs-input", event: "form_field_focused", on: "focus" },
    ],
    tracker: {
      name: "hubspot-forms",

      init(ctx: TrackerContext): void {
        const formStates = new Map<Element, HsFormState>();

        function getOrCreate(form: Element): HsFormState {
          if (!formStates.has(form)) {
            formStates.set(form, {
              started: false,
              submitted: false,
              abandonTimer: null,
            });
          }
          return formStates.get(form)!;
        }

        function clearTimer(state: HsFormState): void {
          if (state.abandonTimer !== null) {
            clearTimeout(state.abandonTimer);
            state.abandonTimer = null;
          }
        }

        function fireAbandonment(_form: Element): void {
          ctx.emit("form_abandoned", {
            form_type: "hubspot",
            page_name: ctx.getPageName(),
          });
        }

        function startAbandonTimer(form: Element, state: HsFormState): void {
          if (!config?.abandonment) return;
          clearTimer(state);
          state.abandonTimer = setTimeout(() => {
            if (!state.submitted) {
              fireAbandonment(form);
            }
          }, config.abandonment.timeout);
        }

        ctx.onElementAdded("form.hs-form", (form) => {
          const state = getOrCreate(form);

          form.addEventListener("focusin", () => {
            if (state.submitted) return;
            if (!state.started) {
              state.started = true;
              ctx.emit("form_started", {
                form_type: "hubspot",
                page_name: ctx.getPageName(),
              });
            }
            startAbandonTimer(form, state);
          });

          form.addEventListener("submit", () => {
            clearTimer(state);
            state.submitted = true;
            ctx.emit("form_submitted", {
              form_type: "hubspot",
              page_name: ctx.getPageName(),
            });
          });
        });
      },

      destroy(): void {},
    },
  };
}
