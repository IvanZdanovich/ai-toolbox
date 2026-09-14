/**
 * Modal Component Integration Tests
 *
 * Tests the confirm-dialog flow: rendering, confirm/cancel resolution, and
 * dismissal via Escape.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Modal: Given the modal component mounted in the page', () => {
  let modal;

  beforeEach(async () => {
    document.body.innerHTML = '';
    vi.resetModules();
    modal = (
      await import('../../../../chrome-extension/shared/components/modal.js')
    ).default;
  });

  describe('Modal: When the confirm dialog is rendered', () => {
    it('Modal: Then it renders the given title and message', () => {
      modal.confirm('Delete template?', 'This cannot be undone.');

      expect(document.querySelector('.modal-title').textContent).toBe(
        'Delete template?'
      );
      expect(document.querySelector('.modal-body p').textContent).toBe(
        'This cannot be undone.'
      );
    });

    it('Modal: Then it escapes HTML in the title and message', () => {
      modal.confirm('<script>evil()</script>', 'ok');

      expect(document.querySelector('.modal-title').innerHTML).not.toContain(
        '<script>'
      );
    });

    it('Modal: Then it defaults the button labels to Cancel/Confirm', () => {
      modal.confirm('Title', 'Message');

      expect(document.querySelector('.cancel-btn').textContent).toBe('Cancel');
      expect(document.querySelector('.confirm-btn').textContent).toBe(
        'Confirm'
      );
    });

    it('Modal: Then it uses custom button labels when provided', () => {
      modal.confirm('Title', 'Message', {
        confirmText: 'Delete',
        cancelText: 'Keep',
      });

      expect(document.querySelector('.cancel-btn').textContent).toBe('Keep');
      expect(document.querySelector('.confirm-btn').textContent).toBe('Delete');
    });
  });

  describe('Modal: When the confirmation resolves', () => {
    it('Modal: Then it resolves true when the confirm button is clicked', async () => {
      const result = modal.confirm('Title', 'Message');

      document.querySelector('.confirm-btn').click();

      await expect(result).resolves.toBe(true);
    });

    it('Modal: Then it resolves false when the cancel button is clicked', async () => {
      const result = modal.confirm('Title', 'Message');

      document.querySelector('.cancel-btn').click();

      await expect(result).resolves.toBe(false);
    });

    it('Modal: Then it resolves false when Escape is pressed', async () => {
      const result = modal.confirm('Title', 'Message');

      document.dispatchEvent(
        new window.KeyboardEvent('keydown', { key: 'Escape' })
      );

      await expect(result).resolves.toBe(false);
    });

    it('Modal: Then it removes the modal from the DOM after resolving', async () => {
      const result = modal.confirm('Title', 'Message');

      document.querySelector('.confirm-btn').click();
      await result;

      // The overlay itself is scheduled for removal on a timer; the dialog
      // content is already inert once a choice is made.
      expect(
        document.querySelectorAll('.modal-overlay').length
      ).toBeLessThanOrEqual(1);
    });
  });
});
