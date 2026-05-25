import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFullScreenDialog } from './dialog';

describe('createFullScreenDialog', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('closes the top dialog with Escape', () => {
    const firstClose = vi.fn();
    const secondClose = vi.fn();
    createFullScreenDialog(document.createElement('div'), 'First', firstClose);
    createFullScreenDialog(document.createElement('div'), 'Second', secondClose);

    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));

    expect(document.querySelectorAll('.fullScreenDialog').length).toBe(1);
    expect(document.querySelector('.fullScreenDialog h2')!.textContent).toBe('First');
    expect(firstClose).not.toHaveBeenCalled();
    expect(secondClose).toHaveBeenCalledTimes(1);

    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));

    expect(document.querySelector('.fullScreenDialog')).toBeNull();
    expect(firstClose).toHaveBeenCalledTimes(1);
  });

  it('cleans up Escape handling when removed programmatically', () => {
    const closeCallback = vi.fn();
    const dialog = createFullScreenDialog(document.createElement('div'), 'Dialog', closeCallback);

    dialog.remove();
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));

    expect(closeCallback).not.toHaveBeenCalled();
    expect(document.querySelector('.fullScreenDialog')).toBeNull();
  });

  it('omits the visible title when title text is empty', () => {
    createFullScreenDialog(document.createElement('div'), '');

    expect(document.querySelector('.fullScreenDialog h2')).toBeNull();
  });
});
