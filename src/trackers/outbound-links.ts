import { Tracker, TrackerContext } from "../core/types";

export function outboundLinks(): Tracker {
  let ctx: TrackerContext | null = null;
  let handler: ((e: Event) => void) | null = null;

  return {
    name: "outbound-links",

    init(context: TrackerContext): void {
      ctx = context;
      handler = (e: Event) => {
        const target = e.target as Element | null;
        if (!target || !ctx) return;

        const anchor = target.closest("a") as HTMLAnchorElement | null;
        if (!anchor) return;

        const href = anchor.href;
        if (!href) return;

        let url: URL;
        try {
          url = new URL(href);
        } catch {
          return;
        }

        if (url.protocol !== "http:" && url.protocol !== "https:") return;
        if (url.hostname === window.location.hostname) return;

        const text = (anchor.textContent || "").trim().slice(0, 100);
        ctx.emit("outbound_click", {
          url: href,
          hostname: url.hostname,
          link_text: text,
          page_name: ctx.getPageName(),
        });
      };
      document.addEventListener("click", handler, true);
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
