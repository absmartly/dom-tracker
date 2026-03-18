import { SPAObserver } from '../../core/SPAObserver';

describe('SPAObserver', () => {
  let onRouteChange: jest.Mock;
  let onDOMMutation: jest.Mock;
  let observer: SPAObserver;

  beforeEach(() => {
    onRouteChange = jest.fn();
    onDOMMutation = jest.fn();
    observer = new SPAObserver({ onRouteChange, onDOMMutation, debug: false });
    document.body.innerHTML = '';
  });

  afterEach(() => {
    observer.destroy();
  });

  it('detects history.pushState route changes', () => {
    observer.start();
    history.pushState({}, '', '/new-page');
    expect(onRouteChange).toHaveBeenCalledWith(expect.stringContaining('/new-page'), expect.any(String));
  });

  it('detects history.replaceState route changes', () => {
    observer.start();
    history.replaceState({}, '', '/replaced-page');
    expect(onRouteChange).toHaveBeenCalledWith(expect.stringContaining('/replaced-page'), expect.any(String));
  });

  it('detects popstate events', () => {
    observer.start();
    const prevUrl = window.location.href;
    window.dispatchEvent(new PopStateEvent('popstate', {}));
    expect(onRouteChange).toHaveBeenCalledWith(window.location.href, prevUrl);
  });

  it('restores original pushState/replaceState on destroy', () => {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    observer.start();
    observer.destroy();
    expect(history.pushState).toBe(originalPushState);
    expect(history.replaceState).toBe(originalReplaceState);
  });

  it('does not call onRouteChange after destroy', () => {
    observer.start();
    observer.destroy();
    history.pushState({}, '', '/after-destroy');
    expect(onRouteChange).not.toHaveBeenCalled();
  });

  it('onElementAdded fires for existing matching elements', () => {
    document.body.innerHTML = '<div class="tracked"></div>';
    observer.start();

    const callback = jest.fn();
    observer.onElementAdded('.tracked', callback);

    expect(callback).toHaveBeenCalledWith(document.querySelector('.tracked'));
  });

  it('onElementAdded fires for dynamically added elements', async () => {
    observer.start();
    const callback = jest.fn();
    observer.onElementAdded('.dynamic', callback);

    const el = document.createElement('div');
    el.className = 'dynamic';
    document.body.appendChild(el);

    await new Promise((r) => setTimeout(r, 50));

    expect(callback).toHaveBeenCalledWith(el);
  });

  it('unsubscribe from onElementAdded stops future callbacks', async () => {
    observer.start();
    const callback = jest.fn();
    const unsubscribe = observer.onElementAdded('.dynamic', callback);
    unsubscribe();

    const el = document.createElement('div');
    el.className = 'dynamic';
    document.body.appendChild(el);

    await new Promise((r) => setTimeout(r, 50));

    expect(callback).not.toHaveBeenCalled();
  });

  it('onElementRemoved fires when element is removed from DOM', async () => {
    const el = document.createElement('div');
    el.className = 'removable';
    document.body.appendChild(el);

    observer.start();
    const callback = jest.fn();
    observer.onElementRemoved('.removable', callback);

    document.body.removeChild(el);

    await new Promise((r) => setTimeout(r, 50));

    expect(callback).toHaveBeenCalledWith(el);
  });
});
