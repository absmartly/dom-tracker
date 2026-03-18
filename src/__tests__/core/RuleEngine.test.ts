import { RuleEngine } from '../../core/RuleEngine';

describe('RuleEngine', () => {
  let emit: jest.Mock;
  let getPageName: jest.Mock;
  let engine: RuleEngine;

  beforeEach(() => {
    emit = jest.fn();
    getPageName = jest.fn().mockReturnValue('test-page');
    engine = new RuleEngine(emit, getPageName, false);
    document.body.innerHTML = '';
  });

  afterEach(() => {
    engine.destroy();
  });

  it('binds click events for rules and emits on click', () => {
    document.body.innerHTML = '<button class="cta">Buy</button>';
    engine.addRule({ selector: '.cta', event: 'cta_clicked' });
    engine.bind();

    document.querySelector('.cta')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(emit).toHaveBeenCalledWith('cta_clicked', { page_name: 'test-page' });
  });

  it('merges rule props into emitted payload', () => {
    document.body.innerHTML = '<button class="cta">Buy</button>';
    engine.addRule({ selector: '.cta', event: 'cta_clicked', props: { campaign: 'summer', position: 1 } });
    engine.bind();

    document.querySelector('.cta')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(emit).toHaveBeenCalledWith('cta_clicked', { campaign: 'summer', position: 1, page_name: 'test-page' });
  });

  it('uses custom event type via rule.on', () => {
    document.body.innerHTML = '<input class="search-input" />';
    engine.addRule({ selector: '.search-input', event: 'search_focused', on: 'focus' });
    engine.bind();

    document.querySelector('.search-input')!.dispatchEvent(new FocusEvent('focus', { bubbles: true }));

    expect(emit).toHaveBeenCalledWith('search_focused', { page_name: 'test-page' });
  });

  it('does not throw for invalid selectors', () => {
    engine.addRule({ selector: '!!!invalid!!!', event: 'never' });
    expect(() => engine.bind()).not.toThrow();
  });

  it('does not fire after destroy', () => {
    document.body.innerHTML = '<button class="cta">Buy</button>';
    engine.addRule({ selector: '.cta', event: 'cta_clicked' });
    engine.bind();
    engine.destroy();

    document.querySelector('.cta')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(emit).not.toHaveBeenCalled();
  });

  it('addRule can be called after bind and then rebind picks it up', () => {
    document.body.innerHTML = '<button class="btn1">A</button><button class="btn2">B</button>';
    engine.addRule({ selector: '.btn1', event: 'btn1_clicked' });
    engine.bind();
    engine.addRule({ selector: '.btn2', event: 'btn2_clicked' });
    engine.rebind();

    document.querySelector('.btn1')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.querySelector('.btn2')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(emit).toHaveBeenCalledWith('btn1_clicked', { page_name: 'test-page' });
    expect(emit).toHaveBeenCalledWith('btn2_clicked', { page_name: 'test-page' });
  });

  it('skips elements with data-abs-track attribute', () => {
    document.body.innerHTML = '<button class="cta" data-abs-track="already_tracked">Buy</button>';
    engine.addRule({ selector: '.cta', event: 'cta_clicked' });
    engine.bind();

    document.querySelector('.cta')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(emit).not.toHaveBeenCalled();
  });

  it('handles multiple matching elements', () => {
    document.body.innerHTML = '<button class="btn">A</button><button class="btn">B</button>';
    engine.addRule({ selector: '.btn', event: 'btn_clicked' });
    engine.bind();

    const buttons = document.querySelectorAll('.btn');
    buttons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    buttons[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(emit).toHaveBeenCalledTimes(2);
  });
});
