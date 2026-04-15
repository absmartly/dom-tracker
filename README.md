# @absmartly/dom-tracker

[![CI](https://github.com/absmartly/dom-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/absmartly/dom-tracker/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@absmartly/dom-tracker)](https://www.npmjs.com/package/@absmartly/dom-tracker)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Lightweight, framework-agnostic DOM analytics tracking library. Capture user interactions through **data attributes** and **CSS selector rules** — no framework integration required.

## Features

- **Data-attribute tracking** — add `data-abs-track` to any element to capture clicks
- **CSS selector rules** — define rules that match elements and fire events on interaction
- **Built-in trackers** — page views, scroll depth, time on page, form tracking, session tracking
- **SPA support** — automatic route change detection via History API patching
- **DOM mutation monitoring** — tracks dynamically added/removed elements
- **Preset system** — pre-built configurations (e.g., HubSpot forms)
- **Tree-shakeable** — import only the trackers you need
- **Zero dependencies** — no runtime dependencies
- **TypeScript** — fully typed with exported type definitions
- **Multiple formats** — CommonJS, ES Modules, and UMD browser bundle

## Installation

```bash
# npm
npm install @absmartly/dom-tracker

# yarn
yarn add @absmartly/dom-tracker

# bun
bun add @absmartly/dom-tracker
```

Or use the UMD bundle directly in a `<script>` tag:

```html
<script src="https://unpkg.com/@absmartly/dom-tracker/dist/dom-tracker.min.js"></script>
<script>
  const tracker = new ABsmartlyDOMTracker.DOMTracker({ /* ... */ });
</script>
```

## Quick Start

```typescript
import { DOMTracker } from "@absmartly/dom-tracker";

const tracker = new DOMTracker({
  onEvent: (event, props) => {
    console.log(event, props);
    // Send to your analytics provider
  },
  spa: true,
});
```

```html
<button data-abs-track="signup_click" data-abs-plan="pro">
  Sign Up
</button>
<!-- Clicking emits: "signup_click" { plan: "pro", page_name: "pricing" } -->
```

## Configuration

The `DOMTracker` constructor accepts a `DOMTrackerConfig` object:

```typescript
interface DOMTrackerConfig {
  // Required — called for every tracked event
  onEvent: EventHandler | EventHandler[];

  // Optional — called when a tracker sets attributes (e.g., session data)
  onAttribute?: AttributeHandler | AttributeHandler[];

  // Additional trackers to register
  trackers?: Tracker[];

  // CSS selector tracking rules
  rules?: TrackingRule[];

  // Pre-built presets (rules + trackers)
  presets?: Preset[];

  // Enable SPA route change detection (default: false)
  spa?: boolean;

  // Auto-register default trackers: page-views, forms, session (default: true)
  defaults?: boolean;

  // Log debug info to console (default: false)
  debug?: boolean;

  // Custom page name derivation (default: last URL path segment)
  pageName?: (url: URL) => string;
}
```

**Handler types:**

```typescript
type EventHandler = (event: string, props: Record<string, unknown>) => void;
type AttributeHandler = (attrs: Record<string, unknown>) => void;
```

Multiple handlers are supported — pass an array and each will be called independently:

```typescript
const tracker = new DOMTracker({
  onEvent: [
    (event, props) => analytics.track(event, props),
    (event, props) => console.log(event, props),
  ],
});
```

## Data Attribute Tracking

Add `data-abs-track` to any HTML element to automatically capture click events. Additional `data-abs-*` attributes are included as event properties.

```html
<button
  data-abs-track="add_to_cart"
  data-abs-product-id="123"
  data-abs-price="29.99"
  data-abs-is-sale="true"
>
  Add to Cart
</button>
```

This emits:

```json
{
  "event": "add_to_cart",
  "props": {
    "product_id": "123",
    "price": 29.99,
    "is_sale": true,
    "page_name": "product-detail"
  }
}
```

**Attribute parsing rules:**
- `data-abs-track` — the event name (required)
- `data-abs-*` — additional properties (kebab-case converted to snake_case)
- `"true"` / `"false"` — coerced to booleans
- Numeric strings — coerced to numbers
- `page_name` — automatically injected

**Debouncing:** Duplicate events on the same element are suppressed for 500ms.

## CSS Selector Rules

Define rules that match elements by CSS selector and fire events on interaction:

```typescript
const tracker = new DOMTracker({
  onEvent: (event, props) => console.log(event, props),
  rules: [
    {
      selector: ".cta-button",
      event: "cta_clicked",
      props: { section: "hero" },
    },
    {
      selector: ".search-input",
      event: "search_focused",
      on: "focus",
    },
  ],
});
```

```typescript
interface TrackingRule {
  selector: string;                  // CSS selector to match
  event: string;                     // Event name to emit
  on?: string;                       // DOM event type (default: "click")
  props?: Record<string, unknown>;   // Static properties to include
}
```

Rules use event delegation on the `window`, so they automatically work for dynamically added elements. Elements with `data-abs-track` are skipped to prevent double-tracking. Click events are debounced at 500ms per rule per element.

Rules can also be added after initialization:

```typescript
tracker.addRule({ selector: ".new-feature", event: "feature_click" });
```

## Built-in Trackers

By default, `DOMTracker` auto-registers the **page-views**, **form-tracker**, and **session** trackers. Set `defaults: false` to disable this.

### Page Views

Emits a `page_view` event on initialization and on every SPA route change.

**Event:** `page_view`

| Property | Description |
|---|---|
| `page_name` | Derived page name |
| `page_path` | URL pathname |
| `page_url` | Full URL |
| `referrer` | Document referrer |

```typescript
import { pageViews } from "@absmartly/dom-tracker";

const tracker = new DOMTracker({
  onEvent: handler,
  defaults: false,
  trackers: [pageViews()],
});
```

### Scroll Depth

Tracks how far users scroll down the page.

**Event:** `scroll_depth`

| Property | Description |
|---|---|
| `threshold` | Scroll percentage reached |
| `page_name` | Current page name |

**Config:**

```typescript
import { scrollDepth } from "@absmartly/dom-tracker";

scrollDepth({
  thresholds: [25, 50, 75, 100], // default
});
```

Each threshold fires once per page. Thresholds reset on route change. Scroll events are throttled at 200ms.

### Time on Page

Measures how long users spend on each page.

**Events:**

| Event | Properties | Description |
|---|---|---|
| `time_on_page` | `seconds`, `page_name` | Fires at each threshold |
| `tab_hidden` | `page_name`, `time_on_page` | Tab became hidden (optional) |
| `tab_visible` | `page_name`, `hidden_duration` | Tab became visible (optional) |

**Config:**

```typescript
import { timeOnPage } from "@absmartly/dom-tracker";

timeOnPage({
  thresholds: [10, 30, 60, 180], // seconds (default)
  visibility: {
    trackEvents: false, // emit tab_hidden/tab_visible events (default: false)
  },
});
```

The timer pauses when the tab is hidden and resumes when visible. Thresholds reset on route change.

### Form Tracking

Tracks form interactions: start, submission, and abandonment.

**Events:**

| Event | Properties | Description |
|---|---|---|
| `form_started` | `form_id`, `form_action`, `page_name` | First field focused |
| `form_submitted` | `form_id`, `form_action`, `page_name` | Form submitted |
| `form_abandoned` | `form_id`, `fields_completed`, `last_field`, `page_name` | Inactivity timeout or route change |

**Config:**

```typescript
import { formTracker } from "@absmartly/dom-tracker";

formTracker({
  abandonment: {
    timeout: 30000, // ms before firing form_abandoned (optional)
  },
});
```

**Form ID derivation** (first match wins): `data-abs-form-id` attribute → `form.id` → `form.name` → auto-generated ID.

Abandonment fires when a user starts filling a form but doesn't submit within the timeout, or when they navigate away (SPA route change).

### Session Tracking

Generates visitor and session IDs, detects traffic source, device type, and extracts UTM parameters.

**Event:** `session_start`

| Property | Description |
|---|---|
| `session_id` | Unique session identifier |
| `landing_page` | URL pathname of first page |
| `referrer` | Document referrer |

**Attributes set** (via `onAttribute`):

| Attribute | Description |
|---|---|
| `returning_visitor` | `true` if visitor cookie existed |
| `traffic_source` | `"direct"`, `"organic"`, `"social"`, `"referral"`, or `"paid"` |
| `device` | `"desktop"`, `"mobile"`, or `"tablet"` |
| `utm_source` | UTM source parameter |
| `utm_medium` | UTM medium parameter |
| `utm_campaign` | UTM campaign parameter |
| `utm_term` | UTM term parameter |
| `utm_content` | UTM content parameter |

**Config:**

```typescript
import { sessionTracker } from "@absmartly/dom-tracker";

sessionTracker({
  cookieDomain: ".example.com", // optional
});
```

**Cookies:**
- `_abs_visitor` — 365-day cookie for visitor ID (falls back to localStorage)
- `_abs_session` — 1-day cookie for session ID (falls back to sessionStorage)

**Traffic source detection:**
- `"paid"` — utm_source parameter present
- `"organic"` — referrer from Google, Bing, Yahoo, DuckDuckGo, or Baidu
- `"social"` — referrer from Facebook, Instagram, Twitter, LinkedIn, TikTok, or Pinterest
- `"referral"` — any other referrer
- `"direct"` — no referrer

### Rage Clicks

Detects rapid repeated clicks on the same element, which typically indicates user frustration.

**Event:** `rage_click`

| Property | Description |
|---|---|
| `element_tag` | HTML tag name of the clicked element |
| `element_text` | Visible text content (truncated to 100 chars) |
| `click_count` | Number of clicks that triggered the event |
| `page_name` | Current page name |

**Config:**

```typescript
import { rageClicks } from "@absmartly/dom-tracker/trackers/rage-clicks";

rageClicks({
  threshold: 3,    // clicks required to trigger (default)
  window: 1000,    // time window in ms (default)
});
```

Click counters reset on route change.

### Dead Clicks

Detects clicks on non-interactive elements, indicating broken or confusing UI.

**Event:** `dead_click`

| Property | Description |
|---|---|
| `element_tag` | HTML tag name of the clicked element |
| `element_text` | Visible text content (truncated to 100 chars) |
| `page_name` | Current page name |

```typescript
import { deadClicks } from "@absmartly/dom-tracker/trackers/dead-clicks";

deadClicks();
```

An element is considered interactive if it or any ancestor is: a native interactive tag (`a`, `button`, `input`, `select`, `textarea`, `label`, `summary`, `details`), has an ARIA role (`button`, `link`, `tab`, `menuitem`, etc.), has an `onclick` attribute, has `data-abs-track`, or has `contenteditable`. Events are debounced to one per element per second, with a 500ms delay before the interactivity check runs.

### Element Visibility

Tracks when elements enter the viewport, useful for impression tracking.

**Event:** `element_visible` (or a custom event name per element/rule)

| Property | Description |
|---|---|
| `event_name` | Value of `data-abs-visible` or the rule's `event` field |
| `page_name` | Current page name |
| `...` | Any additional `data-abs-*` props on the element |

**Two ways to mark elements:**

1. **Data attribute** — add `data-abs-visible="impression_name"` to any element, with optional `data-abs-*` props:

```html
<div
  data-abs-visible="hero_banner_seen"
  data-abs-variant="dark"
>
  <!-- ... -->
</div>
```

2. **Config rules** — match elements by CSS selector:

```typescript
import { elementVisibility } from "@absmartly/dom-tracker/trackers/element-visibility";

elementVisibility({
  threshold: 0.5, // fraction of element that must be visible (default)
  rules: [
    { selector: ".pricing-card", event: "pricing_card_seen" },
    { selector: "#hero-banner", event: "hero_banner_seen" },
  ],
});
```

Each element fires once per page. Seen elements reset on route change.

### Outbound Link Clicks

Tracks clicks on links that navigate to an external hostname.

**Event:** `outbound_click`

| Property | Description |
|---|---|
| `url` | Full destination URL |
| `hostname` | Destination hostname |
| `link_text` | Anchor text (truncated to 100 chars) |
| `page_name` | Current page name |

```typescript
import { outboundLinks } from "@absmartly/dom-tracker/trackers/outbound-links";

outboundLinks();
```

`mailto:` and `tel:` links are ignored. Detection uses event delegation, so clicks on child elements inside an anchor are captured correctly.

### Error Tracking

Captures unhandled JavaScript errors and promise rejections.

**Event:** `js_error`

| Property | Description |
|---|---|
| `message` | Error message |
| `filename` | Source file URL |
| `lineno` | Line number |
| `colno` | Column number |
| `stack` | Stack trace (truncated to 1000 chars) |
| `page_name` | Current page name |

**Config:**

```typescript
import { errorTracker } from "@absmartly/dom-tracker/trackers/error-tracking";

errorTracker({
  maxErrors: 10,      // max errors captured per page (default)
  dedupeWindow: 5000, // ms to suppress identical errors (default)
});
```

Listens to `window.onerror` and `unhandledrejection`. Identical errors (same message + filename + lineno) are deduplicated within `dedupeWindow`. The per-page error count resets on route change.

## SPA Support

Enable `spa: true` to automatically detect route changes in single-page applications:

```typescript
const tracker = new DOMTracker({
  onEvent: handler,
  spa: true,
});
```

This:
- Patches `history.pushState()` and `history.replaceState()`
- Listens for `popstate` and `hashchange` events
- Starts a `MutationObserver` on `document.body`
- Notifies all trackers of route changes (resetting scroll depth, time on page, etc.)
- Lets trackers subscribe to element additions/removals

## Presets

Presets bundle tracking rules and a tracker into a reusable configuration.

### Using a Preset

```typescript
import { DOMTracker } from "@absmartly/dom-tracker";
import { hubspotForms } from "@absmartly/dom-tracker/presets/hubspot";

const tracker = new DOMTracker({
  onEvent: handler,
  spa: true,
  presets: [
    hubspotForms({ abandonment: { timeout: 30000 } }),
  ],
});
```

### HubSpot Forms Preset

Tracks HubSpot embedded forms (`form.hs-form`) with automatic detection of dynamically injected forms.

**Rules:** Tracks `.hs-input` focus events as `form_field_focused`.

**Events:**

| Event | Properties |
|---|---|
| `form_started` | `form_type: "hubspot"`, `page_name` |
| `form_submitted` | `form_type: "hubspot"`, `page_name` |
| `form_abandoned` | `form_type: "hubspot"`, `page_name` |

### Creating a Custom Preset

```typescript
import { definePreset } from "@absmartly/dom-tracker";

const myPreset = definePreset({
  rules: [
    { selector: ".pricing-card", event: "pricing_viewed", on: "mouseenter" },
  ],
  tracker: {
    name: "my-custom-tracker",
    init(ctx) { /* ... */ },
    destroy() { /* ... */ },
  },
});
```

## Custom Trackers

Implement the `Tracker` interface to create your own:

```typescript
import { Tracker, TrackerContext } from "@absmartly/dom-tracker";

const myTracker: Tracker = {
  name: "my-tracker",

  init(ctx: TrackerContext) {
    ctx.emit("tracker_loaded", { page_name: ctx.getPageName() });
  },

  onRouteChange(url: string, prevUrl: string) {
    // Called on SPA navigation
  },

  onDOMMutation(mutations: MutationRecord[]) {
    // Called on DOM changes (SPA mode only)
  },

  destroy() {
    // Clean up listeners, timers, etc.
  },
};
```

### TrackerContext API

The `ctx` object passed to `init()` provides:

| Method | Description |
|---|---|
| `emit(event, props)` | Emit a tracking event |
| `setAttributes(attrs)` | Set session/visitor attributes |
| `getPageName()` | Get current page name |
| `getConfig()` | Access DOMTrackerConfig |
| `querySelectorAll(selector)` | Query DOM elements |
| `onElementAdded(selector, cb)` | Subscribe to element additions (returns unsubscribe fn) |
| `onElementRemoved(selector, cb)` | Subscribe to element removals (returns unsubscribe fn) |

Register custom trackers at construction or dynamically:

```typescript
// At construction
const dom = new DOMTracker({
  onEvent: handler,
  trackers: [myTracker],
});

// Or later
dom.addTracker(myTracker);
dom.removeTracker("my-tracker");
```

## API Reference

### `DOMTracker`

```typescript
const tracker = new DOMTracker(config: DOMTrackerConfig);

tracker.addTracker(tracker: Tracker): void;
tracker.removeTracker(name: string): void;
tracker.addRule(rule: TrackingRule): void;
tracker.destroy(): void;
```

- **`addTracker`** — Register a new tracker. Throws if a tracker with the same name exists.
- **`removeTracker`** — Unregister and destroy a tracker by name. No-op if not found.
- **`addRule`** — Add a CSS selector tracking rule at runtime.
- **`destroy`** — Remove all event listeners, destroy all trackers, clean up. Idempotent.

### Sub-path Imports

Individual trackers and presets can be imported directly for tree-shaking:

```typescript
import { pageViews } from "@absmartly/dom-tracker/trackers/page-views";
import { scrollDepth } from "@absmartly/dom-tracker/trackers/scroll";
import { timeOnPage } from "@absmartly/dom-tracker/trackers/time";
import { formTracker } from "@absmartly/dom-tracker/trackers/forms";
import { sessionTracker } from "@absmartly/dom-tracker/trackers/session";
import { rageClicks } from "@absmartly/dom-tracker/trackers/rage-clicks";
import { deadClicks } from "@absmartly/dom-tracker/trackers/dead-clicks";
import { elementVisibility } from "@absmartly/dom-tracker/trackers/element-visibility";
import { outboundLinks } from "@absmartly/dom-tracker/trackers/outbound-links";
import { errorTracker } from "@absmartly/dom-tracker/trackers/error-tracking";
import { definePreset } from "@absmartly/dom-tracker/presets";
import { hubspotForms } from "@absmartly/dom-tracker/presets/hubspot";
```

## Browser Bundle

The UMD bundle exposes global variables for use without a bundler:

```html
<!-- Default bundle -->
<script src="https://unpkg.com/@absmartly/dom-tracker/dist/dom-tracker.min.js"></script>
<script>
  const tracker = new ABsmartlyDOMTracker.DOMTracker({
    onEvent: function (event, props) {
      console.log(event, props);
    },
    spa: true,
  });
</script>

<!-- Full bundle (includes all trackers and presets) -->
<script src="https://unpkg.com/@absmartly/dom-tracker/dist/dom-tracker.full.min.js"></script>
<script>
  // ABsmartlyDOMTrackerFull includes everything
  const tracker = new ABsmartlyDOMTrackerFull.DOMTracker({ /* ... */ });
</script>
```

## License

[MIT](LICENSE)
