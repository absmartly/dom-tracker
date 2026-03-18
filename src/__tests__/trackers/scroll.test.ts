import { scrollDepth } from '../../trackers/scroll';
import { TrackerContext } from '../../core/types';

function createMockContext(overrides?: Partial<TrackerContext>): TrackerContext {
  return {
    emit: jest.fn(),
    setAttributes: jest.fn(),
    getConfig: jest.fn(),
    querySelectorAll: jest.fn(),
    onElementAdded: jest.fn(),
    onElementRemoved: jest.fn(),
    getPageName: jest.fn().mockReturnValue('home'),
    ...overrides,
  };
}

function setupScrollEnv(scrollY: number, innerHeight: number, scrollHeight: number): void {
  Object.defineProperty(window, 'scrollY', { value: scrollY, writable: true, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: innerHeight, writable: true, configurable: true });
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    value: scrollHeight,
    writable: true,
    configurable: true,
  });
}

describe('scrollDepth tracker', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    setupScrollEnv(0, 100, 400);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('has correct name', () => {
    expect(scrollDepth().name).toBe('scroll-depth');
  });

  it('fires at default thresholds', () => {
    const tracker = scrollDepth();
    const ctx = createMockContext();
    tracker.init(ctx);

    setupScrollEnv(0, 100, 400);
    window.dispatchEvent(new Event('scroll'));
    jest.runAllTimers();

    expect(ctx.emit).toHaveBeenCalledWith('scroll_depth', { threshold: 25, page_name: 'home' });
  });

  it('fires each threshold only once', () => {
    const tracker = scrollDepth();
    const ctx = createMockContext();
    tracker.init(ctx);

    setupScrollEnv(0, 100, 400);
    window.dispatchEvent(new Event('scroll'));
    jest.runAllTimers();

    const firstCallCount = (ctx.emit as jest.Mock).mock.calls.length;

    window.dispatchEvent(new Event('scroll'));
    jest.runAllTimers();

    expect((ctx.emit as jest.Mock).mock.calls.length).toBe(firstCallCount);
  });

  it('fires at custom thresholds', () => {
    const tracker = scrollDepth({ thresholds: [50] });
    const ctx = createMockContext();
    tracker.init(ctx);

    setupScrollEnv(0, 100, 400);
    window.dispatchEvent(new Event('scroll'));
    jest.runAllTimers();

    expect(ctx.emit).not.toHaveBeenCalledWith('scroll_depth', { threshold: 25, page_name: 'home' });

    setupScrollEnv(100, 100, 400);
    window.dispatchEvent(new Event('scroll'));
    jest.runAllTimers();

    expect(ctx.emit).toHaveBeenCalledWith('scroll_depth', { threshold: 50, page_name: 'home' });
  });

  it('resets fired thresholds on route change', () => {
    const tracker = scrollDepth();
    const ctx = createMockContext();
    tracker.init(ctx);

    setupScrollEnv(0, 100, 400);
    window.dispatchEvent(new Event('scroll'));
    jest.runAllTimers();

    const callsBefore = (ctx.emit as jest.Mock).mock.calls.length;
    expect(callsBefore).toBeGreaterThan(0);

    tracker.onRouteChange!('/new', '/old');
    (ctx.emit as jest.Mock).mockClear();

    window.dispatchEvent(new Event('scroll'));
    jest.runAllTimers();

    expect(ctx.emit).toHaveBeenCalledWith('scroll_depth', { threshold: 25, page_name: 'home' });
  });

  it('removes scroll listener on destroy', () => {
    const tracker = scrollDepth();
    const ctx = createMockContext();
    tracker.init(ctx);
    tracker.destroy();

    setupScrollEnv(0, 100, 400);
    window.dispatchEvent(new Event('scroll'));
    jest.runAllTimers();

    expect(ctx.emit).not.toHaveBeenCalled();
  });

  it('throttles scroll events with 200ms debounce', () => {
    const tracker = scrollDepth();
    const ctx = createMockContext();
    tracker.init(ctx);

    setupScrollEnv(0, 100, 400);
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));

    expect(ctx.emit).not.toHaveBeenCalled();

    jest.advanceTimersByTime(200);

    expect(ctx.emit).toHaveBeenCalledTimes(1);
  });
});
