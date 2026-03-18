import { Tracker, TrackerContext } from '../core/types';

const DEFAULT_THRESHOLDS = [10, 30, 60, 180];

export interface TimeOnPageConfig {
  thresholds?: number[];
  visibility?: {
    trackEvents?: boolean;
  };
}

export function timeOnPage(config?: TimeOnPageConfig): Tracker {
  const thresholds = config?.thresholds ?? DEFAULT_THRESHOLDS;
  const trackVisibilityEvents = config?.visibility?.trackEvents ?? false;

  let ctx: TrackerContext | null = null;
  let elapsed = 0;
  let fired = new Set<number>();
  let paused = false;
  let hiddenAt: number | null = null;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  function onVisibilityChange(): void {
    if (!ctx) return;
    if (document.visibilityState === 'hidden') {
      paused = true;
      hiddenAt = elapsed;
      if (trackVisibilityEvents) {
        ctx.emit('tab_hidden', { page_name: ctx.getPageName(), time_on_page: elapsed });
      }
    } else {
      const hiddenDuration = hiddenAt !== null ? elapsed - hiddenAt : 0;
      paused = false;
      hiddenAt = null;
      if (trackVisibilityEvents) {
        ctx.emit('tab_visible', { page_name: ctx.getPageName(), hidden_duration: hiddenDuration });
      }
    }
  }

  function startInterval(): void {
    intervalId = setInterval(() => {
      if (paused || !ctx) return;
      elapsed += 1;
      for (const threshold of thresholds) {
        if (elapsed >= threshold && !fired.has(threshold)) {
          fired.add(threshold);
          ctx.emit('time_on_page', { seconds: threshold, page_name: ctx.getPageName() });
        }
      }
    }, 1000);
  }

  function reset(): void {
    elapsed = 0;
    fired = new Set<number>();
  }

  return {
    name: 'time-on-page',

    init(context: TrackerContext): void {
      ctx = context;
      startInterval();
      document.addEventListener('visibilitychange', onVisibilityChange);
    },

    onRouteChange(): void {
      reset();
    },

    destroy(): void {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      document.removeEventListener('visibilitychange', onVisibilityChange);
      ctx = null;
    },
  };
}
