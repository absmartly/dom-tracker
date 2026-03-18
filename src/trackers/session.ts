import { Tracker, TrackerContext } from '../core/types';
import { getCookie, setCookie, generateId, isLocalStorageAvailable, isSessionStorageAvailable } from '../utils/cookies';

const VISITOR_COOKIE = '_abs_visitor';
const SESSION_COOKIE = '_abs_session';
const VISITOR_DAYS = 365;
const SESSION_DAYS = 1;

export interface SessionTrackerConfig {
  cookieDomain?: string;
}

function extractUtmParams(url: URL): Record<string, string> {
  const params: Record<string, string> = {};
  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  for (const key of utmKeys) {
    const value = url.searchParams.get(key);
    if (value) {
      params[key] = value;
    }
  }
  return params;
}

function detectTrafficSource(referrer: string): string {
  if (!referrer) return 'direct';
  try {
    const ref = new URL(referrer);
    const host = ref.hostname;
    if (/google\.|bing\.|yahoo\.|duckduckgo\.|baidu\./.test(host)) return 'organic';
    if (/facebook\.|instagram\.|twitter\.|linkedin\.|tiktok\.|pinterest\./.test(host)) return 'social';
    return 'referral';
  } catch {
    return 'direct';
  }
}

function detectDevice(): string {
  const ua = navigator.userAgent;
  if (/tablet|ipad/i.test(ua)) return 'tablet';
  if (/mobile|android|iphone/i.test(ua)) return 'mobile';
  return 'desktop';
}

function getVisitorId(domain?: string): { id: string; returning: boolean } {
  const existing = getCookie(VISITOR_COOKIE);
  if (existing) {
    setCookie(VISITOR_COOKIE, existing, { days: VISITOR_DAYS, path: '/', domain });
    return { id: existing, returning: true };
  }

  if (isLocalStorageAvailable()) {
    const stored = window.localStorage.getItem(VISITOR_COOKIE);
    if (stored) {
      try {
        setCookie(VISITOR_COOKIE, stored, { days: VISITOR_DAYS, path: '/', domain });
      } catch {}
      return { id: stored, returning: true };
    }
  }

  const id = generateId();
  try {
    setCookie(VISITOR_COOKIE, id, { days: VISITOR_DAYS, path: '/', domain });
  } catch {}
  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.setItem(VISITOR_COOKIE, id);
    } catch {}
  }
  return { id, returning: false };
}

function getSessionId(domain?: string): { id: string; isNew: boolean } {
  const existing = getCookie(SESSION_COOKIE);
  if (existing) {
    setCookie(SESSION_COOKIE, existing, { days: SESSION_DAYS, path: '/', domain });
    return { id: existing, isNew: false };
  }

  if (isSessionStorageAvailable()) {
    const stored = window.sessionStorage.getItem(SESSION_COOKIE);
    if (stored) {
      try {
        setCookie(SESSION_COOKIE, stored, { days: SESSION_DAYS, path: '/', domain });
      } catch {}
      return { id: stored, isNew: false };
    }
  }

  const id = generateId();
  try {
    setCookie(SESSION_COOKIE, id, { days: SESSION_DAYS, path: '/', domain });
  } catch {}
  if (isSessionStorageAvailable()) {
    try {
      window.sessionStorage.setItem(SESSION_COOKIE, id);
    } catch {}
  }
  return { id, isNew: true };
}

export function sessionTracker(config?: SessionTrackerConfig): Tracker {
  let ctx: TrackerContext | null = null;

  return {
    name: 'session',

    init(context: TrackerContext): void {
      ctx = context;

      const domain = config?.cookieDomain;
      const { returning } = getVisitorId(domain);
      const { id: sessionId, isNew } = getSessionId(domain);

      if (!isNew) return;

      const url = new URL(window.location.href);
      const utmParams = extractUtmParams(url);
      const trafficSource = utmParams.utm_source
        ? 'paid'
        : detectTrafficSource(document.referrer);
      const device = detectDevice();

      const attributes: Record<string, unknown> = {
        returning_visitor: returning,
        traffic_source: trafficSource,
        device,
        ...utmParams,
      };

      ctx.setAttributes(attributes);

      ctx.emit('session_start', {
        session_id: sessionId,
        landing_page: window.location.pathname,
        referrer: document.referrer,
      });
    },

    destroy(): void {
      ctx = null;
    },
  };
}
