import { EventHandler, TrackingRule } from './types';
import { debugLog } from '../utils/debug';

type DelegatedListener = { eventType: string; handler: EventListener };

export class RuleEngine {
  private readonly emit: EventHandler;
  private readonly getPageName: () => string;
  private readonly debug: boolean;
  private rules: TrackingRule[] = [];
  private delegatedListeners: DelegatedListener[] = [];

  constructor(emit: EventHandler, getPageName: () => string, debug: boolean) {
    this.emit = emit;
    this.getPageName = getPageName;
    this.debug = debug;
  }

  addRule(rule: TrackingRule): void {
    this.rules.push(rule);
  }

  bind(): void {
    this.destroy();

    const rulesByEvent = new Map<string, TrackingRule[]>();
    for (const rule of this.rules) {
      const eventType = rule.on ?? 'click';
      const group = rulesByEvent.get(eventType) || [];
      group.push(rule);
      rulesByEvent.set(eventType, group);
    }

    for (const [eventType, rules] of rulesByEvent) {
      const handler: EventListener = (e: Event) => {
        const target = e.target as Element;
        if (!target) return;

        for (const rule of rules) {
          let matched: Element | null = null;
          try {
            matched = target.closest(rule.selector);
          } catch {
            continue;
          }
          if (!matched) continue;
          if (matched.hasAttribute('data-abs-track')) continue;

          const props: Record<string, unknown> = { ...rule.props, page_name: this.getPageName() };
          debugLog(this.debug, 'RuleEngine emit', rule.event, props);
          this.emit(rule.event, props);
          return;
        }
      };

      window.addEventListener(eventType, handler, true);
      this.delegatedListeners.push({ eventType, handler });
    }
  }

  rebind(): void {
    this.destroy();
    this.bind();
  }

  destroy(): void {
    for (const { eventType, handler } of this.delegatedListeners) {
      window.removeEventListener(eventType, handler, true);
    }
    this.delegatedListeners = [];
  }
}
