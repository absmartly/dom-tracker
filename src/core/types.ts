export type EventHandler = (
  event: string,
  props: Record<string, unknown>,
) => void;
export type AttributeHandler = (attrs: Record<string, unknown>) => void;

export interface TrackingRule {
  selector: string;
  event: string;
  on?: string;
  props?: Record<string, unknown>;
}

export interface Preset {
  rules: TrackingRule[];
  tracker?: Tracker;
}

export interface DOMTrackerConfig {
  onEvent: EventHandler | EventHandler[];
  onAttribute?: AttributeHandler | AttributeHandler[];
  trackers?: Tracker[];
  rules?: TrackingRule[];
  presets?: Preset[];
  spa?: boolean;
  defaults?: boolean;
  debug?: boolean;
  pageName?: (url: URL) => string;
}

export interface Tracker {
  name: string;
  init(core: TrackerContext): void;
  destroy(): void;
  onDOMMutation?(mutations: MutationRecord[]): void;
  onRouteChange?(url: string, prevUrl: string): void;
}

export interface TrackerContext {
  emit(event: string, props: Record<string, unknown>): void;
  setAttributes(attrs: Record<string, unknown>): void;
  getConfig(): DOMTrackerConfig;
  querySelectorAll(selector: string): Element[];
  onElementAdded(selector: string, callback: (el: Element) => void): () => void;
  onElementRemoved(
    selector: string,
    callback: (el: Element) => void,
  ): () => void;
  getPageName(): string;
}
