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
        const formStates = new Map<string, HsFormState>();

        function getOrCreate(formId: string): HsFormState {
          if (!formStates.has(formId)) {
            formStates.set(formId, {
              started: false,
              submitted: false,
              abandonTimer: null,
            });
          }
          return formStates.get(formId)!;
        }

        function clearTimer(state: HsFormState): void {
          if (state.abandonTimer !== null) {
            clearTimeout(state.abandonTimer);
            state.abandonTimer = null;
          }
        }

        function fireAbandonment(formId: string): void {
          ctx.emit("form_abandoned", {
            form_type: "hubspot",
            form_id: formId,
            page_name: ctx.getPageName(),
          });
        }

        function startAbandonTimer(formId: string, state: HsFormState): void {
          if (!config?.abandonment) return;
          clearTimer(state);
          state.abandonTimer = setTimeout(() => {
            if (!state.submitted) {
              fireAbandonment(formId);
            }
          }, config.abandonment.timeout);
        }

        ctx.onElementAdded("form.hs-form", (form) => {
          form.addEventListener("focusin", () => {
            const formId = getFormId(form);
            const state = getOrCreate(formId);
            if (state.submitted) return;
            if (!state.started) {
              state.started = true;
              ctx.emit("form_started", {
                form_type: "hubspot",
                form_id: formId,
                page_name: ctx.getPageName(),
              });
            }
            startAbandonTimer(formId, state);
          });
        });

        function onMessage(event: MessageEvent): void {
          const data = event.data;
          if (!data || data.type !== "hsFormCallback") return;

          const formId = data.id || "";

          if (data.eventName === "onFormSubmitted") {
            const state = getOrCreate(formId);
            clearTimer(state);
            state.submitted = true;
            ctx.emit("form_submitted", {
              form_type: "hubspot",
              form_id: data.data?.formGuid || formId,
              conversion_id: data.data?.conversionId || "",
              page_name: ctx.getPageName(),
            });
          }
        }

        window.addEventListener("message", onMessage);
        (this as any)._cleanup = () =>
          window.removeEventListener("message", onMessage);
      },

      destroy(): void {
        if ((this as any)._cleanup) {
          (this as any)._cleanup();
          (this as any)._cleanup = null;
        }
      },
    },
  };
}

function getFormId(form: Element): string {
  return (
    form.getAttribute("data-form-id") ||
    form.querySelector<HTMLInputElement>('input[name="hs_form_id"]')?.value ||
    form.id ||
    ""
  );
}
