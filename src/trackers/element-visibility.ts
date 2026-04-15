import { Tracker, TrackerContext } from "../core/types";
import { parseDataAttributes } from "../utils/dom";

export interface VisibilityRule {
  selector: string;
  event: string;
}

export interface ElementVisibilityConfig {
  threshold?: number;
  rules?: VisibilityRule[];
}

export function elementVisibility(config?: ElementVisibilityConfig): Tracker {
  const threshold = config?.threshold ?? 0.5;
  const rules = config?.rules ?? [];
  let ctx: TrackerContext | null = null;
  let observer: IntersectionObserver | null = null;
  let fired = new WeakSet<Element>();
  const elementEventMap = new Map<
    Element,
    { event: string; props: Record<string, unknown> }
  >();

  function scan(): void {
    /* istanbul ignore if -- defensive guard; scan() is only called from init() after ctx is set */
    if (!ctx) return;

    const attrElements = ctx.querySelectorAll("[data-abs-visible]");
    for (const el of attrElements) {
      if (!elementEventMap.has(el)) {
        const event = el.getAttribute("data-abs-visible") || "element_visible";
        const props = parseDataAttributes(el);
        delete props.visible;
        elementEventMap.set(el, { event, props });
        /* istanbul ignore else -- observer is always set before scan() is called */
        if (observer) observer.observe(el);
      }
    }

    for (const rule of rules) {
      const elements = ctx.querySelectorAll(rule.selector);
      for (const el of elements) {
        if (!elementEventMap.has(el)) {
          elementEventMap.set(el, { event: rule.event, props: {} });
          /* istanbul ignore else -- observer is always set before scan() is called */
          if (observer) observer.observe(el);
        }
      }
    }
  }

  return {
    name: "element-visibility",

    init(context: TrackerContext): void {
      ctx = context;
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting || !ctx) continue;
            if (fired.has(entry.target)) continue;
            fired.add(entry.target);

            const mapping = elementEventMap.get(entry.target);
            const eventName = mapping?.event || "element_visible";
            const extraProps = mapping?.props || {};

            ctx.emit("element_visible", {
              event_name: eventName,
              ...extraProps,
              page_name: ctx.getPageName(),
            });
          }
        },
        { threshold },
      );
      scan();
    },

    onRouteChange(): void {
      fired = new WeakSet<Element>();
    },

    destroy(): void {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      elementEventMap.clear();
      ctx = null;
    },
  };
}
