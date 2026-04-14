import { Tracker, TrackerContext } from "../core/types";

export function pageViews(): Tracker {
  let ctx: TrackerContext | null = null;

  function emitPageView(): void {
    if (!ctx) return;
    ctx.emit("page_view", {
      page_name: ctx.getPageName(),
      page_path: window.location.pathname,
      page_url: window.location.href,
      referrer: document.referrer,
    });
  }

  return {
    name: "page-views",

    init(context: TrackerContext): void {
      ctx = context;
      emitPageView();
    },

    onRouteChange(): void {
      emitPageView();
    },

    destroy(): void {
      ctx = null;
    },
  };
}
