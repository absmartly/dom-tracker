import { EventHandler, TrackingRule } from './types';
import { debugLog } from '../utils/debug';

type BoundListener = { el: Element; eventType: string; handler: EventListener };

export class RuleEngine {
  private readonly emit: EventHandler;
  private readonly getPageName: () => string;
  private readonly debug: boolean;
  private rules: TrackingRule[] = [];
  private listeners: BoundListener[] = [];

  constructor(emit: EventHandler, getPageName: () => string, debug: boolean) {
    this.emit = emit;
    this.getPageName = getPageName;
    this.debug = debug;
  }

  addRule(rule: TrackingRule): void {
    this.rules.push(rule);
  }

  bind(): void {
    for (const rule of this.rules) {
      let elements: NodeListOf<Element>;
      try {
        elements = document.querySelectorAll(rule.selector);
      } catch {
        debugLog(this.debug, 'RuleEngine invalid selector', rule.selector);
        continue;
      }

      const eventType = rule.on ?? 'click';

      for (const el of elements) {
        if (el.hasAttribute('data-abs-track')) continue;

        const handler: EventListener = () => {
          const props: Record<string, unknown> = { ...rule.props, page_name: this.getPageName() };
          debugLog(this.debug, 'RuleEngine emit', rule.event, props);
          this.emit(rule.event, props);
        };

        el.addEventListener(eventType, handler);
        this.listeners.push({ el, eventType, handler });
      }
    }
  }

  rebind(): void {
    this.destroy();
    this.bind();
  }

  destroy(): void {
    for (const { el, eventType, handler } of this.listeners) {
      el.removeEventListener(eventType, handler);
    }
    this.listeners = [];
  }
}
