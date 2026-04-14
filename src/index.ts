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
export { definePreset } from "./presets/index";
export { hubspotForms } from "./presets/hubspot";
