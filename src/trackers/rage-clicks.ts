import { Tracker, TrackerContext } from "../core/types";

export interface RageClicksConfig {
  threshold?: number;
  window?: number;
}

export function rageClicks(config?: RageClicksConfig): Tracker {
  const threshold = config?.threshold ?? 3;
  const windowMs = config?.window ?? 1000;
  let ctx: TrackerContext | null = null;
  let clickLog = new WeakMap<Element, number[]>();
  let handler: ((e: Event) => void) | null = null;

  return {
    name: "rage-clicks",

    init(context: TrackerContext): void {
      ctx = context;
      handler = (e: Event) => {
        const target = e.target as Element | null;
        if (!target || !ctx) return;

        const now = Date.now();
        const timestamps = clickLog.get(target) || [];
        timestamps.push(now);

        const recent = timestamps.filter((t) => now - t < windowMs);
        clickLog.set(target, recent);

        if (recent.length >= threshold) {
          const text = (target.textContent || "").trim().slice(0, 100);
          ctx.emit("rage_click", {
            element_tag: target.tagName,
            element_text: text,
            click_count: recent.length,
            page_name: ctx.getPageName(),
          });
          clickLog.set(target, []);
        }
      };
      document.addEventListener("click", handler, true);
    },

    onRouteChange(): void {
      clickLog = new WeakMap<Element, number[]>();
    },

    destroy(): void {
      if (handler) {
        document.removeEventListener("click", handler, true);
        handler = null;
      }
      ctx = null;
    },
  };
}
