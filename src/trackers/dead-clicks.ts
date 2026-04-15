import { Tracker, TrackerContext } from "../core/types";

const INTERACTIVE_TAGS = new Set([
  "A",
  "BUTTON",
  "INPUT",
  "SELECT",
  "TEXTAREA",
  "LABEL",
  "SUMMARY",
  "DETAILS",
]);
const INTERACTIVE_ROLES = new Set([
  "button",
  "link",
  "tab",
  "menuitem",
  "checkbox",
  "radio",
  "switch",
  "option",
  "combobox",
  "textbox",
]);
const INTERACTIVE_SELECTOR =
  "a,button,input,select,textarea,label,summary,details," +
  "[role],[onclick],[data-abs-track],[contenteditable='true']";

export function deadClicks(): Tracker {
  let ctx: TrackerContext | null = null;
  let handler: ((e: Event) => void) | null = null;
  const pendingTimers = new Set<ReturnType<typeof setTimeout>>();
  const recentlyReported = new WeakSet<Element>();

  function isInteractive(el: Element): boolean {
    if (INTERACTIVE_TAGS.has(el.tagName)) return true;
    const role = el.getAttribute("role");
    if (role && INTERACTIVE_ROLES.has(role)) return true;
    if (el.hasAttribute("onclick")) return true;
    if (el.hasAttribute("data-abs-track")) return true;
    if (el.getAttribute("contenteditable") === "true") return true;
    if (el.closest(INTERACTIVE_SELECTOR)) return true;
    return false;
  }

  return {
    name: "dead-clicks",

    init(context: TrackerContext): void {
      ctx = context;
      handler = (e: Event) => {
        const target = e.target as Element | null;
        if (!target || !ctx) return;
        if (isInteractive(target)) return;
        if (recentlyReported.has(target)) return;

        const timer = setTimeout(() => {
          pendingTimers.delete(timer);
          /* istanbul ignore if -- defensive guard; destroy() clears timers before nulling ctx */
          if (!ctx) return;
          recentlyReported.add(target);
          const text = (target.textContent || "").trim().slice(0, 100);
          ctx.emit("dead_click", {
            element_tag: target.tagName,
            element_text: text,
            page_name: ctx.getPageName(),
          });
          const clearTimer = setTimeout(() => {
            recentlyReported.delete(target);
            pendingTimers.delete(clearTimer);
          }, 1000);
          pendingTimers.add(clearTimer);
        }, 500);
        pendingTimers.add(timer);
      };
      document.addEventListener("click", handler, true);
    },

    destroy(): void {
      if (handler) {
        document.removeEventListener("click", handler, true);
        handler = null;
      }
      for (const timer of pendingTimers) {
        clearTimeout(timer);
      }
      pendingTimers.clear();
      ctx = null;
    },
  };
}
