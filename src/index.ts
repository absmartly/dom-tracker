export { DOMTracker } from "./core/DOMTracker";
export type {
  DOMTrackerConfig,
  Tracker,
  TrackerContext,
  TrackingRule,
  Preset,
  EventHandler,
  AttributeHandler,
} from "./core/types";
export { pageViews } from "./trackers/page-views";
export { scrollDepth } from "./trackers/scroll";
export { timeOnPage } from "./trackers/time";
export { formTracker } from "./trackers/forms";
export { sessionTracker } from "./trackers/session";
export { rageClicks } from "./trackers/rage-clicks";
export { deadClicks } from "./trackers/dead-clicks";
export { elementVisibility } from "./trackers/element-visibility";
export { outboundLinks } from "./trackers/outbound-links";
export { errorTracker } from "./trackers/error-tracking";
export { definePreset } from "./presets/index";
export { hubspotForms } from "./presets/hubspot";
