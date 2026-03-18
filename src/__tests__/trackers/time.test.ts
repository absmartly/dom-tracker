import { timeOnPage } from '../../trackers/time';
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

describe('timeOnPage tracker', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('has correct name', () => {
    expect(timeOnPage().name).toBe('time-on-page');
  });

  it('fires at default thresholds', () => {
    const tracker = timeOnPage();
    const ctx = createMockContext();
    tracker.init(ctx);

    jest.advanceTimersByTime(10000);

    expect(ctx.emit).toHaveBeenCalledWith('time_on_page', { seconds: 10, page_name: 'home' });
  });

  it('fires at custom thresholds', () => {
    const tracker = timeOnPage({ thresholds: [5] });
    const ctx = createMockContext();
    tracker.init(ctx);

    jest.advanceTimersByTime(5000);

    expect(ctx.emit).toHaveBeenCalledWith('time_on_page', { seconds: 5, page_name: 'home' });
  });

  it('fires each threshold only once', () => {
    const tracker = timeOnPage({ thresholds: [5] });
    const ctx = createMockContext();
    tracker.init(ctx);

    jest.advanceTimersByTime(10000);

    const calls = (ctx.emit as jest.Mock).mock.calls.filter(
      ([event, props]) => event === 'time_on_page' && props.seconds === 5,
    );
    expect(calls.length).toBe(1);

    tracker.destroy();
  });

  it('pauses timer when tab is hidden', () => {
    const tracker = timeOnPage();
    const ctx = createMockContext();
    tracker.init(ctx);

    jest.advanceTimersByTime(5000);

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    jest.advanceTimersByTime(10000);

    expect(ctx.emit).not.toHaveBeenCalledWith('time_on_page', { seconds: 10, page_name: 'home' });

    tracker.destroy();
  });

  it('emits tab_hidden and tab_visible when visibility tracking is enabled', () => {
    const tracker = timeOnPage({ visibility: { trackEvents: true } });
    const ctx = createMockContext();
    tracker.init(ctx);

    jest.advanceTimersByTime(5000);

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(ctx.emit).toHaveBeenCalledWith('tab_hidden', { page_name: 'home', time_on_page: 5 });

    Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(ctx.emit).toHaveBeenCalledWith('tab_visible', { page_name: 'home', hidden_duration: 0 });

    tracker.destroy();
  });

  it('does not emit visibility events when tracking is disabled', () => {
    const tracker = timeOnPage();
    const ctx = createMockContext();
    tracker.init(ctx);

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(ctx.emit).not.toHaveBeenCalledWith('tab_hidden', expect.anything());

    tracker.destroy();
  });

  it('resets elapsed and fired thresholds on route change', () => {
    const tracker = timeOnPage({ thresholds: [5] });
    const ctx = createMockContext();
    tracker.init(ctx);

    jest.advanceTimersByTime(5000);
    expect(ctx.emit).toHaveBeenCalledWith('time_on_page', { seconds: 5, page_name: 'home' });

    tracker.onRouteChange!('/new', '/old');
    (ctx.emit as jest.Mock).mockClear();

    jest.advanceTimersByTime(5000);
    expect(ctx.emit).toHaveBeenCalledWith('time_on_page', { seconds: 5, page_name: 'home' });

    tracker.destroy();
  });

  it('cleans up on destroy', () => {
    const tracker = timeOnPage({ thresholds: [5] });
    const ctx = createMockContext();
    tracker.init(ctx);
    tracker.destroy();

    jest.advanceTimersByTime(10000);

    expect(ctx.emit).not.toHaveBeenCalled();
  });
});
