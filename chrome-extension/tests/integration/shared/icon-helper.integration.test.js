/**
 * Icon Helper Integration Tests
 *
 * Tests SVG icon markup generation.
 */

import { describe, it, expect } from 'vitest';
import IconHelper from '../../../shared/icon-helper.js';

describe('Icon Helper Integration', () => {
  describe('Scenario: Building icon markup', () => {
    it('should default to size sm and no color class', () => {
      const html = IconHelper.iconHTML('template');

      expect(html).toBe('<svg class="icon icon--sm"><use href="#icon-template"></use></svg>');
    });

    it('should apply a custom size', () => {
      const html = IconHelper.iconHTML('template', 'lg');

      expect(html).toContain('icon icon--lg');
    });

    it('should append a color modifier class when color is given', () => {
      const html = IconHelper.iconHTML('template', 'sm', 'danger');

      expect(html).toContain('icon--sm icon--danger');
    });

    it('should reference the icon by name via the sprite href', () => {
      const html = IconHelper.iconHTML('history');

      expect(html).toContain('href="#icon-history"');
    });

    it('should omit the color class entirely when color is an empty string', () => {
      const html = IconHelper.iconHTML('history', 'md', '');

      expect(html).not.toContain('icon--md icon--');
    });
  });
});
