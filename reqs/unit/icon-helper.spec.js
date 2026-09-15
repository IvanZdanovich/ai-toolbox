/**
 * Icon Helper Integration Tests
 *
 * Tests SVG icon markup generation.
 */

import { describe, it, expect } from 'vitest';
import IconHelper from '../../chrome-extension/shared/icon-helper.js';

describe('IconHelper: Given the icon markup helper', () => {
  describe('IconHelper: When icon markup is built', () => {
    it('IconHelper: Then it defaults to size sm and no color class', () => {
      const html = IconHelper.iconHTML('template');

      expect(html).toBe(
        '<svg class="icon icon--sm"><use href="#icon-template"></use></svg>'
      );
    });

    it('IconHelper: Then it applies a custom size', () => {
      const html = IconHelper.iconHTML('template', 'lg');

      expect(html).toContain('icon icon--lg');
    });

    it('IconHelper: Then it appends a color modifier class when color is given', () => {
      const html = IconHelper.iconHTML('template', 'sm', 'danger');

      expect(html).toContain('icon--sm icon--danger');
    });

    it('IconHelper: Then it references the icon by name via the sprite href', () => {
      const html = IconHelper.iconHTML('history');

      expect(html).toContain('href="#icon-history"');
    });

    it('IconHelper: Then it omits the color class entirely when color is an empty string', () => {
      const html = IconHelper.iconHTML('history', 'md', '');

      expect(html).not.toContain('icon--md icon--');
    });
  });
});
