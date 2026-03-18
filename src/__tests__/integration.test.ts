import { DOMTracker } from '../core/DOMTracker';
import { scrollDepth } from '../trackers/scroll';

describe('DOMTracker integration', () => {
  let tracker: DOMTracker;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(';').forEach((c) => {
      const name = c.split('=')[0].trim();
      if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    });
  });

  afterEach(() => {
    if (tracker) tracker.destroy();
    document.body.innerHTML = '';
  });

  it('should track data-attribute clicks end-to-end', () => {
    const events: Array<{ event: string; props: Record<string, unknown> }> = [];
    document.body.innerHTML = '<a data-abs-track="cta_clicked" data-abs-cta-type="demo" data-abs-cta-location="hero">Demo</a>';

    tracker = new DOMTracker({
      onEvent: (event, props) => events.push({ event, props }),
      defaults: false,
    });

    (document.querySelector('a') as HTMLElement)!.click();
    const ctaEvent = events.find(e => e.event === 'cta_clicked');
    expect(ctaEvent).toBeDefined();
    expect(ctaEvent!.props.cta_type).toBe('demo');
    expect(ctaEvent!.props.cta_location).toBe('hero');
  });

  it('should track selector rules end-to-end', () => {
    const events: Array<{ event: string; props: Record<string, unknown> }> = [];
    document.body.innerHTML = '<button class="demo-btn">Request Demo</button>';

    tracker = new DOMTracker({
      onEvent: (event, props) => events.push({ event, props }),
      rules: [{ selector: '.demo-btn', event: 'demo_clicked', props: { source: 'hero' } }],
      defaults: false,
    });

    (document.querySelector('.demo-btn') as HTMLElement)!.click();
    const event = events.find(e => e.event === 'demo_clicked');
    expect(event).toBeDefined();
    expect(event!.props.source).toBe('hero');
  });

  it('should load default trackers and emit page_view', () => {
    const events: Array<{ event: string; props: Record<string, unknown> }> = [];
    tracker = new DOMTracker({
      onEvent: (event, props) => events.push({ event, props }),
    });
    const pageView = events.find(e => e.event === 'page_view');
    expect(pageView).toBeDefined();
  });

  it('should merge custom trackers with defaults', () => {
    const events: Array<{ event: string; props: Record<string, unknown> }> = [];
    tracker = new DOMTracker({
      onEvent: (event, props) => events.push({ event, props }),
      trackers: [scrollDepth()],
    });
    const pageView = events.find(e => e.event === 'page_view');
    expect(pageView).toBeDefined();
  });

  it('should set attributes via onAttribute', () => {
    const attrs: Array<Record<string, unknown>> = [];
    tracker = new DOMTracker({
      onEvent: () => {},
      onAttribute: (a) => attrs.push(a),
    });
    expect(attrs.length).toBeGreaterThan(0);
  });

  it('should handle destroy gracefully', () => {
    tracker = new DOMTracker({
      onEvent: () => {},
      defaults: false,
    });
    expect(() => {
      tracker.destroy();
      tracker.destroy();
    }).not.toThrow();
  });
});
