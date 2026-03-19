import { EventHandler } from './types';
import { parseDataAttributes } from '../utils/dom';
import { debugLog } from '../utils/debug';

export class ElementScanner {
  private readonly emit: EventHandler;
  private readonly getPageName: () => string;
  private readonly debug: boolean;
  private handler: ((e: Event) => void) | null = null;

  constructor(emit: EventHandler, getPageName: () => string, debug: boolean) {
    this.emit = emit;
    this.getPageName = getPageName;
    this.debug = debug;
  }

  scan(): void {
    this.handler = (e: Event) => {
      const el = (e.target as Element)?.closest('[data-abs-track]');
      if (!el) return;

      const event = el.getAttribute('data-abs-track');
      if (!event) return;

      const elAny = el as any;
      if (!elAny.__absLastFired) elAny.__absLastFired = {};
      const now = Date.now();
      if (elAny.__absLastFired[event] && now - elAny.__absLastFired[event] < 500) return;
      elAny.__absLastFired[event] = now;

      const props = parseDataAttributes(el);
      props.page_name = this.getPageName();

      debugLog(this.debug, 'ElementScanner emit', event, props);
      this.emit(event, props);
    };

    window.addEventListener('pointerdown', this.handler, true);
    window.addEventListener('click', this.handler, true);
  }

  destroy(): void {
    if (this.handler) {
      window.removeEventListener('pointerdown', this.handler, true);
      window.removeEventListener('click', this.handler, true);
      this.handler = null;
    }
  }
}
