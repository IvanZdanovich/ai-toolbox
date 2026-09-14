/**
 * Toast Component Integration Tests
 *
 * Tests notification rendering, auto-dismiss timing, and manual dismissal.
 * jsdom has no Web Animations API, so `Element.animate` is stubbed to invoke
 * its `onfinish` callback synchronously on assignment.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Toast Component Integration', () => {
  let toast;

  beforeEach(async () => {
    document.body.innerHTML = '<div id="toastContainer"></div>';

    HTMLElement.prototype.animate = function stubAnimate() {
      const controls = {};
      Object.defineProperty(controls, 'onfinish', {
        set(fn) {
          if (typeof fn === 'function') {
            fn();
          }
        },
      });
      return controls;
    };

    vi.useFakeTimers();
    vi.resetModules();
    toast = (await import('../../../../shared/components/toast.js')).default;
  });

  afterEach(() => {
    vi.useRealTimers();
    delete HTMLElement.prototype.animate;
  });

  describe('Scenario: Showing a toast', () => {
    it('should render the message text', () => {
      toast.show('Template saved');

      expect(document.querySelector('.toast-message').textContent).toBe(
        'Template saved'
      );
    });

    it('should escape HTML in the message', () => {
      toast.show('<img src=x onerror=alert(1)>');

      expect(document.querySelector('.toast-message').innerHTML).not.toContain(
        '<img'
      );
    });

    it('should default to the success type', () => {
      toast.show('Done');

      expect(document.querySelector('.toast').className).toContain('success');
    });

    it('should warn and do nothing when the container is missing', () => {
      document.body.innerHTML = '';
      vi.resetModules();
      return import('../../../../shared/components/toast.js').then(
        ({ default: freshToast }) => {
          const warnSpy = vi
            .spyOn(console, 'warn')
            .mockImplementation(() => {});
          const id = freshToast.show('No container');

          expect(id).toBeUndefined();
          warnSpy.mockRestore();
        }
      );
    });
  });

  describe('Scenario: Type-specific defaults', () => {
    it.each([
      ['success', 3000],
      ['error', 5000],
      ['warning', 5000],
      ['info', 3000],
    ])(
      '%s toast should auto-dismiss after its default duration',
      (type, duration) => {
        toast.show('Message', type);

        vi.advanceTimersByTime(duration - 1);
        expect(document.querySelectorAll('[data-toast-id]')).toHaveLength(1);

        vi.advanceTimersByTime(1);
        expect(document.querySelectorAll('[data-toast-id]')).toHaveLength(0);
      }
    );
  });

  describe('Scenario: Manual dismissal', () => {
    it('should remove the toast when clicked', () => {
      toast.show('Click to dismiss');
      const el = document.querySelector('[data-toast-id]');

      el.click();

      expect(document.querySelectorAll('[data-toast-id]')).toHaveLength(0);
    });

    it('should not auto-dismiss when duration is 0', () => {
      toast.show('Persistent', 'info', 0);

      vi.advanceTimersByTime(60000);

      expect(document.querySelectorAll('[data-toast-id]')).toHaveLength(1);
    });

    it('should ignore hide() for an id that was already removed', () => {
      const id = toast.show('Gone soon', 'info', 100);
      vi.advanceTimersByTime(100);

      expect(() => toast.hide(id)).not.toThrow();
    });
  });

  describe('Scenario: Convenience methods route to the right type', () => {
    it.each([
      ['success', 'success'],
      ['error', 'error'],
      ['warning', 'warning'],
      ['info', 'info'],
    ])('%s() should render a %s toast', (method, expectedType) => {
      toast[method]('Message');

      expect(document.querySelector('.toast').className).toContain(
        expectedType
      );
    });
  });

  describe('Scenario: Clearing all toasts', () => {
    it('should remove every visible toast', () => {
      toast.show('One', 'info', 0);
      toast.show('Two', 'info', 0);

      toast.clear();

      expect(document.querySelectorAll('[data-toast-id]')).toHaveLength(0);
    });
  });
});
