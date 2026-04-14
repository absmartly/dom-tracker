import { debugLog } from "../utils/debug";

type RouteChangeHandler = (url: string, prevUrl: string) => void;
type MutationHandler = (mutations: MutationRecord[]) => void;
type ElementCallback = (el: Element) => void;

interface SPAObserverConfig {
  onRouteChange?: RouteChangeHandler;
  onDOMMutation?: MutationHandler;
  debug?: boolean;
}

interface ElementSubscription {
  selector: string;
  callback: ElementCallback;
  type: "added" | "removed";
}

export class SPAObserver {
  private readonly config: SPAObserverConfig;
  private mutationObserver: MutationObserver | null = null;
  private subscriptions: ElementSubscription[] = [];
  private originalPushState: typeof history.pushState | null = null;
  private originalReplaceState: typeof history.replaceState | null = null;
  private popstateHandler: (() => void) | null = null;
  private hashchangeHandler: (() => void) | null = null;
  private currentUrl: string =
    /* istanbul ignore next -- window is always defined in browser; SSR guard */
    typeof window !== "undefined" ? window.location.href : "";

  constructor(config: SPAObserverConfig) {
    this.config = config;
  }

  start(): void {
    this.patchHistory();
    this.listenForNavigation();
    this.startMutationObserver();
  }

  destroy(): void {
    this.restoreHistory();

    if (this.popstateHandler) {
      window.removeEventListener("popstate", this.popstateHandler);
      this.popstateHandler = null;
    }
    if (this.hashchangeHandler) {
      window.removeEventListener("hashchange", this.hashchangeHandler);
      this.hashchangeHandler = null;
    }

    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    this.subscriptions = [];
  }

  onElementAdded(selector: string, callback: ElementCallback): () => void {
    const sub: ElementSubscription = { selector, callback, type: "added" };
    this.subscriptions.push(sub);

    try {
      const existing = document.querySelectorAll(selector);
      for (const el of existing) {
        callback(el);
      }
    } catch {
      debugLog(
        this.config.debug ?? false,
        "SPAObserver invalid selector",
        selector,
      );
    }

    return () => {
      this.subscriptions = this.subscriptions.filter((s) => s !== sub);
    };
  }

  onElementRemoved(selector: string, callback: ElementCallback): () => void {
    const sub: ElementSubscription = { selector, callback, type: "removed" };
    this.subscriptions.push(sub);

    return () => {
      this.subscriptions = this.subscriptions.filter((s) => s !== sub);
    };
  }

  private patchHistory(): void {
    this.originalPushState = history.pushState;
    this.originalReplaceState = history.replaceState;

    const self = this;

    history.pushState = function (...args) {
      const prev = self.currentUrl;
      self.originalPushState!.apply(history, args);
      self.currentUrl = window.location.href;
      debugLog(
        self.config.debug ?? false,
        "SPAObserver pushState",
        self.currentUrl,
      );
      self.config.onRouteChange?.(self.currentUrl, prev);
    };

    history.replaceState = function (...args) {
      const prev = self.currentUrl;
      self.originalReplaceState!.apply(history, args);
      self.currentUrl = window.location.href;
      debugLog(
        self.config.debug ?? false,
        "SPAObserver replaceState",
        self.currentUrl,
      );
      self.config.onRouteChange?.(self.currentUrl, prev);
    };
  }

  private restoreHistory(): void {
    if (this.originalPushState) {
      history.pushState = this.originalPushState;
      this.originalPushState = null;
    }
    if (this.originalReplaceState) {
      history.replaceState = this.originalReplaceState;
      this.originalReplaceState = null;
    }
  }

  private listenForNavigation(): void {
    this.popstateHandler = () => {
      const prev = this.currentUrl;
      this.currentUrl = window.location.href;
      this.config.onRouteChange?.(this.currentUrl, prev);
    };

    this.hashchangeHandler = () => {
      const prev = this.currentUrl;
      this.currentUrl = window.location.href;
      this.config.onRouteChange?.(this.currentUrl, prev);
    };

    window.addEventListener("popstate", this.popstateHandler);
    window.addEventListener("hashchange", this.hashchangeHandler);
  }

  private startMutationObserver(): void {
    this.mutationObserver = new MutationObserver((mutations) => {
      this.config.onDOMMutation?.(mutations);
      this.handleMutations(mutations);
    });

    if (document.body) {
      this.mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }
  }

  private handleMutations(mutations: MutationRecord[]): void {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        const el = node as Element;
        for (const sub of this.subscriptions) {
          if (sub.type !== "added") continue;
          try {
            if (el.matches(sub.selector)) {
              sub.callback(el);
            }
            const descendants = el.querySelectorAll(sub.selector);
            for (const desc of descendants) {
              sub.callback(desc);
            }
          } catch {
            debugLog(
              this.config.debug ?? false,
              "SPAObserver invalid selector",
              sub.selector,
            );
          }
        }
      }

      for (const node of mutation.removedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        const el = node as Element;
        for (const sub of this.subscriptions) {
          if (sub.type !== "removed") continue;
          try {
            if (el.matches(sub.selector)) {
              sub.callback(el);
            }
          } catch {
            debugLog(
              this.config.debug ?? false,
              "SPAObserver invalid selector",
              sub.selector,
            );
          }
        }
      }
    }
  }
}
