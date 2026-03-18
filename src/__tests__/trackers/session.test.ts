import { sessionTracker } from '../../trackers/session';
import { TrackerContext } from '../../core/types';

jest.mock('../../utils/cookies', () => ({
  getCookie: jest.fn(),
  setCookie: jest.fn(),
  generateId: jest.fn().mockReturnValue('generated-id'),
  isLocalStorageAvailable: jest.fn().mockReturnValue(false),
  isSessionStorageAvailable: jest.fn().mockReturnValue(false),
}));

import {
  getCookie,
  setCookie,
  generateId,
  isLocalStorageAvailable,
  isSessionStorageAvailable,
} from '../../utils/cookies';

const mockGetCookie = getCookie as jest.MockedFunction<typeof getCookie>;
const mockSetCookie = setCookie as jest.MockedFunction<typeof setCookie>;
const mockGenerateId = generateId as jest.MockedFunction<typeof generateId>;
const mockIsLocalStorageAvailable = isLocalStorageAvailable as jest.MockedFunction<typeof isLocalStorageAvailable>;
const mockIsSessionStorageAvailable = isSessionStorageAvailable as jest.MockedFunction<
  typeof isSessionStorageAvailable
>;

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

describe('sessionTracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsLocalStorageAvailable.mockReturnValue(false);
    mockIsSessionStorageAvailable.mockReturnValue(false);

    Object.defineProperty(window, 'location', {
      value: {
        href: 'https://example.com/landing',
        pathname: '/landing',
        search: '',
      },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(document, 'referrer', {
      value: '',
      writable: true,
      configurable: true,
    });
  });

  it('has correct name', () => {
    expect(sessionTracker().name).toBe('session');
  });

  it('emits session_start for new sessions', () => {
    mockGetCookie.mockReturnValue(null);
    mockGenerateId.mockReturnValueOnce('visitor-id').mockReturnValueOnce('session-id');

    const tracker = sessionTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    expect(ctx.emit).toHaveBeenCalledWith('session_start', {
      session_id: 'session-id',
      landing_page: '/landing',
      referrer: '',
    });
  });

  it('sets returning_visitor=false for new visitors', () => {
    mockGetCookie.mockReturnValue(null);
    mockGenerateId.mockReturnValueOnce('visitor-id').mockReturnValueOnce('session-id');

    const tracker = sessionTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    expect(ctx.setAttributes).toHaveBeenCalledWith(
      expect.objectContaining({ returning_visitor: false }),
    );
  });

  it('sets returning_visitor=true when visitor cookie exists', () => {
    mockGetCookie
      .mockReturnValueOnce('existing-visitor-id')
      .mockReturnValueOnce(null);
    mockGenerateId.mockReturnValueOnce('session-id');

    const tracker = sessionTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    expect(ctx.setAttributes).toHaveBeenCalledWith(
      expect.objectContaining({ returning_visitor: true }),
    );
  });

  it('does not emit session_start when session cookie exists', () => {
    mockGetCookie
      .mockReturnValueOnce('existing-visitor-id')
      .mockReturnValueOnce('existing-session-id');

    const tracker = sessionTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    expect(ctx.emit).not.toHaveBeenCalled();
  });

  it('sets session cookie', () => {
    mockGetCookie.mockReturnValue(null);
    mockGenerateId.mockReturnValueOnce('visitor-id').mockReturnValueOnce('session-id');

    const tracker = sessionTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    expect(mockSetCookie).toHaveBeenCalledWith('_abs_session', 'session-id', expect.objectContaining({ days: 1 }));
  });

  it('extracts UTM params from URL', () => {
    Object.defineProperty(window, 'location', {
      value: {
        href: 'https://example.com/landing?utm_source=google&utm_medium=cpc&utm_campaign=test',
        pathname: '/landing',
        search: '?utm_source=google&utm_medium=cpc&utm_campaign=test',
      },
      writable: true,
      configurable: true,
    });

    mockGetCookie.mockReturnValue(null);
    mockGenerateId.mockReturnValueOnce('visitor-id').mockReturnValueOnce('session-id');

    const tracker = sessionTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    expect(ctx.setAttributes).toHaveBeenCalledWith(
      expect.objectContaining({
        utm_source: 'google',
        utm_medium: 'cpc',
        utm_campaign: 'test',
      }),
    );
  });

  it('falls back to sessionStorage when cookies are unavailable for session', () => {
    mockGetCookie.mockReturnValue(null);
    mockIsSessionStorageAvailable.mockReturnValue(true);
    mockGenerateId.mockReturnValueOnce('visitor-id').mockReturnValueOnce('session-id');

    const sessionStorageMock: Record<string, string> = {};
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: jest.fn((key: string) => sessionStorageMock[key] ?? null),
        setItem: jest.fn((key: string, value: string) => {
          sessionStorageMock[key] = value;
        }),
        removeItem: jest.fn(),
      },
      writable: true,
      configurable: true,
    });

    mockSetCookie.mockImplementation(() => {
      throw new Error('cookies blocked');
    });

    const tracker = sessionTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    expect(window.sessionStorage.setItem).toHaveBeenCalledWith('_abs_session', 'session-id');
  });

  it('falls back to localStorage when cookies are unavailable for visitor', () => {
    mockGetCookie.mockReturnValue(null);
    mockIsLocalStorageAvailable.mockReturnValue(true);
    mockGenerateId.mockReturnValueOnce('visitor-id').mockReturnValueOnce('session-id');

    const localStorageMock: Record<string, string> = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key: string) => localStorageMock[key] ?? null),
        setItem: jest.fn((key: string, value: string) => {
          localStorageMock[key] = value;
        }),
        removeItem: jest.fn(),
      },
      writable: true,
      configurable: true,
    });

    mockSetCookie.mockImplementation(() => {
      throw new Error('cookies blocked');
    });

    const tracker = sessionTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    expect(window.localStorage.setItem).toHaveBeenCalledWith('_abs_visitor', 'visitor-id');
  });

  it('sets device attribute', () => {
    mockGetCookie.mockReturnValue(null);
    mockGenerateId.mockReturnValueOnce('visitor-id').mockReturnValueOnce('session-id');

    const tracker = sessionTracker();
    const ctx = createMockContext();
    tracker.init(ctx);

    expect(ctx.setAttributes).toHaveBeenCalledWith(
      expect.objectContaining({ device: expect.stringMatching(/^(desktop|mobile|tablet)$/) }),
    );
  });

  it('does not emit after destroy', () => {
    mockGetCookie.mockReturnValue(null);
    mockGenerateId.mockReturnValueOnce('visitor-id').mockReturnValueOnce('session-id');

    const tracker = sessionTracker();
    const ctx = createMockContext();
    tracker.init(ctx);
    tracker.destroy();

    expect(ctx).toBeTruthy();
  });
});
