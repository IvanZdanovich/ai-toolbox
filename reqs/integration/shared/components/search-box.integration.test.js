/**
 * Search Box Integration Tests
 *
 * Covers the dual role of a list section's search box: a dropdown of matching
 * entries to jump to, and Enter with nothing picked opening an ad-hoc chat.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSearchBox } from '../../../../chrome-extension/shared/components/search-box.js';

const SUGGESTIONS = [
  { id: 'template-1', title: 'Email Response', meta: 'Professional replies' },
  { id: 'template-2', title: 'Code Documentation', meta: '' },
];

describe('Search Box Integration', () => {
  let input;
  let dropdown;
  let onSearch;
  let onSelect;
  let onAsk;

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = `
      <input id="search" type="text" />
      <div id="dropdown" class="hidden"></div>
    `;
    input = document.getElementById('search');
    dropdown = document.getElementById('dropdown');
    onSearch = vi.fn().mockResolvedValue(SUGGESTIONS);
    onSelect = vi.fn();
    onAsk = vi.fn();

    createSearchBox({ input, dropdown, onSearch, onSelect, onAsk });
  });

  async function type(text) {
    input.value = text;
    input.dispatchEvent(new Event('input'));
    await vi.advanceTimersByTimeAsync(300);
  }

  function pressEnter() {
    input.dispatchEvent(
      new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    );
  }

  describe('Scenario: Typing to find an existing entry', () => {
    it('should list the matches once the search settles', async () => {
      await type('email');

      expect(onSearch).toHaveBeenCalledWith('email');
      expect(dropdown.classList.contains('hidden')).toBe(false);
      expect(input.getAttribute('aria-expanded')).toBe('true');
      expect(dropdown.querySelectorAll('.search-dropdown-item')).toHaveLength(
        2
      );
    });

    it('should debounce so a burst of keystrokes searches once', async () => {
      input.value = 'e';
      input.dispatchEvent(new Event('input'));
      input.value = 'em';
      input.dispatchEvent(new Event('input'));
      await type('ema');

      expect(onSearch).toHaveBeenCalledTimes(1);
      expect(onSearch).toHaveBeenCalledWith('ema');
    });

    it('should show at most six suggestions', async () => {
      onSearch.mockResolvedValue(
        Array.from({ length: 12 }, (_, i) => ({
          id: `t-${i}`,
          title: `Template ${i}`,
          meta: '',
        }))
      );

      await type('t');

      expect(dropdown.querySelectorAll('.search-dropdown-item')).toHaveLength(
        6
      );
    });

    it('should stay closed when the box is cleared back to blank', async () => {
      await type('email');
      await type('   ');

      expect(dropdown.classList.contains('hidden')).toBe(true);
      expect(input.getAttribute('aria-expanded')).toBe('false');
    });

    it('should stay closed when nothing matches', async () => {
      onSearch.mockResolvedValue([]);

      await type('nothing matches this');

      expect(dropdown.classList.contains('hidden')).toBe(true);
      expect(dropdown.innerHTML).toBe('');
    });

    it('should escape entry text rather than render it as markup', async () => {
      onSearch.mockResolvedValue([
        { id: 'x', title: '<img src=x onerror=alert(1)>', meta: '' },
      ]);

      await type('x');

      expect(dropdown.querySelector('img')).toBeNull();
      expect(dropdown.textContent).toContain('<img src=x onerror=alert(1)>');
    });
  });

  describe('Scenario: Picking an entry from the dropdown', () => {
    it('should open the picked entry and clear the box', async () => {
      await type('email');
      dropdown
        .querySelector('.search-dropdown-item')
        .dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true }));
      await vi.advanceTimersByTimeAsync(0);

      expect(onSelect).toHaveBeenCalledWith('template-1');
      expect(onAsk).not.toHaveBeenCalled();
      expect(input.value).toBe('');
      expect(dropdown.classList.contains('hidden')).toBe(true);
      expect(onSearch).toHaveBeenLastCalledWith('');
    });

    it('should ignore a click on the dropdown background', async () => {
      await type('email');
      dropdown.dispatchEvent(
        new window.MouseEvent('mousedown', { bubbles: true })
      );

      expect(onSelect).not.toHaveBeenCalled();
      expect(input.value).toBe('email');
    });
  });

  describe('Scenario: Asking the AI instead of picking an entry', () => {
    it('should open a chat with the typed text on Enter', async () => {
      await type('how do I chain two templates?');
      pressEnter();
      await vi.advanceTimersByTimeAsync(0);

      expect(onAsk).toHaveBeenCalledWith('how do I chain two templates?');
      expect(onSelect).not.toHaveBeenCalled();
      expect(input.value).toBe('');
      expect(dropdown.classList.contains('hidden')).toBe(true);
    });

    it('should do nothing on Enter with a blank box', async () => {
      await type('   ');
      pressEnter();

      expect(onAsk).not.toHaveBeenCalled();
    });
  });

  describe('Scenario: Leaving the search box', () => {
    it('should close the dropdown on blur', async () => {
      await type('email');
      input.dispatchEvent(new window.FocusEvent('blur'));
      await vi.advanceTimersByTimeAsync(100);

      expect(dropdown.classList.contains('hidden')).toBe(true);
      expect(input.getAttribute('aria-expanded')).toBe('false');
    });
  });
});
