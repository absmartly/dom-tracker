import { Tracker, TrackerContext } from '../core/types';

const DEFAULT_THRESHOLDS = [25, 50, 75, 100];

export function scrollDepth(config?: { thresholds?: number[] }): Tracker {
  const thresholds = config?.thresholds ?? DEFAULT_THRESHOLDS;
  let ctx: TrackerContext | null = null;
  let fired = new Set<number>();
  let throttleTimer: ReturnType<typeof setTimeout> | null = null;

  function onScroll(): void {
    if (throttleTimer !== null) return;
    throttleTimer = setTimeout(() => {
      throttleTimer = null;
      if (!ctx) return;
      const scrollY = window.scrollY;
      const innerHeight = window.innerHeight;
      const scrollHeight = document.documentElement.scrollHeight;
      const percent = Math.round(((scrollY + innerHeight) / scrollHeight) * 100);
      for (const threshold of thresholds) {
        if (percent >= threshold && !fired.has(threshold)) {
          fired.add(threshold);
          ctx.emit('scroll_depth', { threshold, page_name: ctx.getPageName() });
        }
      }
    }, 200);
  }

  return {
    name: 'scroll-depth',

    init(context: TrackerContext): void {
      ctx = context;
      window.addEventListener('scroll', onScroll, { passive: true });
    },

    onRouteChange(): void {
      fired = new Set<number>();
    },

    destroy(): void {
      window.removeEventListener('scroll', onScroll);
      if (throttleTimer !== null) {
        clearTimeout(throttleTimer);
        throttleTimer = null;
      }
      ctx = null;
    },
  };
}
