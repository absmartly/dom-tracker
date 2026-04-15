import { Tracker, TrackerContext } from "../core/types";

export interface ErrorTrackerConfig {
  maxErrors?: number;
  dedupeWindow?: number;
}

export function errorTracker(config?: ErrorTrackerConfig): Tracker {
  const maxErrors = config?.maxErrors ?? 10;
  const dedupeWindow = config?.dedupeWindow ?? 5000;
  let ctx: TrackerContext | null = null;
  let errorCount = 0;
  let errorHandler: ((e: ErrorEvent) => void) | null = null;
  let rejectionHandler: ((e: PromiseRejectionEvent) => void) | null = null;
  const recentErrors = new Map<string, number>();
  const dedupeTimers = new Set<ReturnType<typeof setTimeout>>();

  function dedupeKey(
    message: string,
    filename?: string,
    lineno?: number,
  ): string {
    return `${message}|${filename || ""}|${lineno || 0}`;
  }

  function isDuplicate(key: string): boolean {
    return recentErrors.has(key);
  }

  function trackDedupe(key: string): void {
    recentErrors.set(key, Date.now());
    const timer = setTimeout(() => {
      recentErrors.delete(key);
      dedupeTimers.delete(timer);
    }, dedupeWindow);
    dedupeTimers.add(timer);
  }

  function emitError(
    message: string,
    filename: string,
    lineno: number,
    colno: number,
    stack: string,
  ): void {
    /* istanbul ignore if */
    if (!ctx) return;
    if (errorCount >= maxErrors) return;

    const key = dedupeKey(message, filename, lineno);
    if (isDuplicate(key)) return;

    errorCount++;
    trackDedupe(key);
    ctx.emit("js_error", {
      message,
      filename,
      lineno,
      colno,
      stack: stack.slice(0, 1000),
      page_name: ctx.getPageName(),
    });
  }

  return {
    name: "error-tracker",

    init(context: TrackerContext): void {
      ctx = context;

      errorHandler = (e: ErrorEvent) => {
        emitError(
          e.message || "Unknown error",
          e.filename || "",
          e.lineno || 0,
          e.colno || 0,
          e.error?.stack || "",
        );
      };

      rejectionHandler = (e: PromiseRejectionEvent) => {
        const reason = e.reason;
        const message =
          reason instanceof Error
            ? reason.message
            : String(reason || "Unhandled rejection");
        const stack = reason instanceof Error ? reason.stack || "" : "";
        emitError(message, "", 0, 0, stack);
      };

      window.addEventListener("error", errorHandler);
      window.addEventListener("unhandledrejection", rejectionHandler);
    },

    onRouteChange(): void {
      errorCount = 0;
      recentErrors.clear();
    },

    destroy(): void {
      if (errorHandler) {
        window.removeEventListener("error", errorHandler);
        errorHandler = null;
      }
      if (rejectionHandler) {
        window.removeEventListener("unhandledrejection", rejectionHandler);
        rejectionHandler = null;
      }
      for (const timer of dedupeTimers) {
        clearTimeout(timer);
      }
      dedupeTimers.clear();
      recentErrors.clear();
      ctx = null;
    },
  };
}
