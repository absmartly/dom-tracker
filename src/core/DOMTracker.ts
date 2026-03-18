import { DOMTrackerConfig, Tracker, TrackerContext, TrackingRule } from './types';
import { ElementScanner } from './ElementScanner';
import { RuleEngine } from './RuleEngine';
import { SPAObserver } from './SPAObserver';
import { debugLog } from '../utils/debug';
import { getPageName as defaultGetPageName } from '../utils/dom';

export class DOMTracker {
  private readonly config: DOMTrackerConfig;
  private readonly onEventHandlers: Array<(event: string, props: Record<string, unknown>) => void> = [];
  private readonly onAttributeHandlers: Array<(attrs: Record<string, unknown>) => void> = [];
  private readonly trackers: Map<string, Tracker> = new Map();
  private elementScanner: ElementScanner | null = null;
  private ruleEngine: RuleEngine | null = null;
  private spaObserver: SPAObserver | null = null;
  private destroyed = false;

  constructor(config: DOMTrackerConfig) {
    this.config = config;

    if (typeof window === 'undefined') return;

    const eventHandlers = Array.isArray(config.onEvent) ? config.onEvent : [config.onEvent];
    this.onEventHandlers.push(...eventHandlers);
    const attrHandlers = config.onAttribute
      ? Array.isArray(config.onAttribute)
        ? config.onAttribute
        : [config.onAttribute]
      : [];
    this.onAttributeHandlers.push(...attrHandlers);

    this.elementScanner = new ElementScanner(this.emit.bind(this), this.getPageName.bind(this), config.debug ?? false);
    this.ruleEngine = new RuleEngine(this.emit.bind(this), this.getPageName.bind(this), config.debug ?? false);

    for (const rule of config.rules ?? []) {
      this.ruleEngine.addRule(rule);
    }

    for (const preset of config.presets ?? []) {
      for (const rule of preset.rules) {
        this.ruleEngine.addRule(rule);
      }
      if (preset.tracker) {
        this.registerTracker(preset.tracker);
      }
    }

    if (config.spa) {
      this.spaObserver = new SPAObserver({
        onRouteChange: (url, prevUrl) => this.handleRouteChange(url, prevUrl),
        onDOMMutation: (mutations) => this.handleDOMMutation(mutations),
        debug: config.debug,
      });
      this.spaObserver.start();
    }

    this.elementScanner.scan();
    this.ruleEngine.bind();

    if (config.defaults !== false) {
      const { pageViews } = require('../trackers/page-views');
      const { formTracker } = require('../trackers/forms');
      const { sessionTracker } = require('../trackers/session');
      for (const factory of [pageViews, formTracker, sessionTracker]) {
        const t = factory();
        if (!this.trackers.has(t.name)) this.registerTracker(t);
      }
    }

    for (const tracker of config.trackers ?? []) {
      this.registerTracker(tracker);
    }
  }

  private emit(event: string, props: Record<string, unknown>): void {
    for (const handler of this.onEventHandlers) {
      try {
        handler(event, props);
      } catch (err) {
        debugLog(this.config.debug ?? false, 'onEvent handler error', err);
      }
    }
  }

  private setAttributes(attrs: Record<string, unknown>): void {
    for (const handler of this.onAttributeHandlers) {
      try {
        handler(attrs);
      } catch (err) {
        debugLog(this.config.debug ?? false, 'onAttribute handler error', err);
      }
    }
  }

  private getPageName(): string {
    const url = new URL(window.location.href);
    if (this.config.pageName) {
      return this.config.pageName(url);
    }
    return defaultGetPageName(url);
  }

  private createContext(): TrackerContext {
    return {
      emit: this.emit.bind(this),
      setAttributes: this.setAttributes.bind(this),
      getConfig: () => this.config,
      querySelectorAll: (sel) => Array.from(document.querySelectorAll(sel)),
      onElementAdded: (sel, cb) => {
        if (this.spaObserver) return this.spaObserver.onElementAdded(sel, cb);
        try {
          for (const el of Array.from(document.querySelectorAll(sel))) cb(el);
        } catch {}
        return () => {};
      },
      onElementRemoved: (sel, cb) => {
        if (this.spaObserver) return this.spaObserver.onElementRemoved(sel, cb);
        return () => {};
      },
      getPageName: this.getPageName.bind(this),
    };
  }

  private registerTracker(tracker: Tracker): void {
    const ctx = this.createContext();
    this.trackers.set(tracker.name, tracker);
    try {
      tracker.init(ctx);
    } catch (err) {
      debugLog(this.config.debug ?? false, 'tracker init error', tracker.name, err);
    }
  }

  private destroyTracker(tracker: Tracker): void {
    try {
      tracker.destroy();
    } catch (err) {
      debugLog(this.config.debug ?? false, 'tracker destroy error', tracker.name, err);
    }
  }

  private handleRouteChange(url: string, prevUrl: string): void {
    for (const tracker of this.trackers.values()) {
      if (tracker.onRouteChange) {
        try {
          tracker.onRouteChange(url, prevUrl);
        } catch (err) {
          debugLog(this.config.debug ?? false, 'tracker onRouteChange error', tracker.name, err);
        }
      }
    }
    this.ruleEngine?.rebind();
  }

  private handleDOMMutation(mutations: MutationRecord[]): void {
    for (const tracker of this.trackers.values()) {
      if (tracker.onDOMMutation) {
        try {
          tracker.onDOMMutation(mutations);
        } catch (err) {
          debugLog(this.config.debug ?? false, 'tracker onDOMMutation error', tracker.name, err);
        }
      }
    }
  }

  addTracker(tracker: Tracker): void {
    if (this.trackers.has(tracker.name)) {
      throw new Error(`Tracker "${tracker.name}" is already registered`);
    }
    this.registerTracker(tracker);
  }

  removeTracker(name: string): void {
    const tracker = this.trackers.get(name);
    if (!tracker) return;
    this.trackers.delete(name);
    this.destroyTracker(tracker);
  }

  addRule(rule: TrackingRule): void {
    this.ruleEngine?.addRule(rule);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    this.elementScanner?.destroy();
    this.ruleEngine?.destroy();
    this.spaObserver?.destroy();

    for (const tracker of this.trackers.values()) {
      this.destroyTracker(tracker);
    }
    this.trackers.clear();
  }
}
