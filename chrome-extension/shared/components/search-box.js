import { debounce, sanitizeText, truncateText } from '../helpers.js';

const MAX_SUGGESTIONS = 6;
const SEARCH_DEBOUNCE_MS = 300;
// Long enough for a dropdown mousedown to land before blur hides the list.
const BLUR_HIDE_DELAY_MS = 100;

// A list section's search box, which serves two purposes at once, kept
// distinct by how they're triggered: typing lists matching entries in a
// dropdown to jump straight to (mouse click = "show me that one"), while
// pressing Enter with nothing picked sends the typed text to the AI as a new
// ad-hoc chat (keyboard Enter = "ask the AI").
//
// The caller owns what "search" means: `onSearch` runs its own filtering —
// which also drives the full list below the box — and returns the normalized
// `{ id, title, meta }` suggestions to show, so this component never knows
// about templates, workflows, or history entries.
export function createSearchBox({
  input,
  dropdown,
  onSearch,
  onSelect,
  onAsk,
}) {
  // Index of the arrow-key-highlighted suggestion, or -1 for "none picked",
  // which is what keeps Enter meaning "ask the AI" until the user has
  // actually moved into the list.
  let activeIndex = -1;

  input.setAttribute('aria-autocomplete', 'list');

  function items() {
    return [...dropdown.querySelectorAll('.search-dropdown-item')];
  }

  function hide() {
    dropdown.classList.add('hidden');
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    activeIndex = -1;
  }

  // Focus stays in the input throughout — the combobox pattern moves a
  // visual/AT pointer with aria-activedescendant instead, so typing keeps
  // working while the user walks the list.
  function setActive(index) {
    const list = items();
    if (list.length === 0) {
      return;
    }

    activeIndex = (index + list.length) % list.length;
    list.forEach((item, i) => {
      const isActive = i === activeIndex;
      item.classList.toggle('active', isActive);
      item.setAttribute('aria-selected', String(isActive));
      if (isActive) {
        input.setAttribute('aria-activedescendant', item.id);
        item.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  function render(suggestions) {
    if (suggestions.length === 0) {
      dropdown.innerHTML = '';
      hide();
      return;
    }

    dropdown.innerHTML = suggestions
      .slice(0, MAX_SUGGESTIONS)
      .map(
        ({ id, title, meta }, i) => `
        <div class="search-dropdown-item" id="${dropdown.id}-opt-${i}" data-id="${sanitizeText(id)}" role="option" aria-selected="false">
          <span>${sanitizeText(title)}</span>
          ${meta ? `<span class="search-dropdown-item-meta">${sanitizeText(truncateText(meta, 60))}</span>` : ''}
        </div>
      `
      )
      .join('');
    dropdown.classList.remove('hidden');
    input.setAttribute('aria-expanded', 'true');
    activeIndex = -1;
    input.removeAttribute('aria-activedescendant');
  }

  async function reset() {
    input.value = '';
    hide();
    await onSearch('');
  }

  const runSearch = debounce(async (query) => {
    const suggestions = await onSearch(query);
    render(query.trim() ? suggestions : []);
  }, SEARCH_DEBOUNCE_MS);

  input.addEventListener('input', (e) => runSearch(e.target.value));

  input.addEventListener('keydown', (e) => {
    const isOpen = !dropdown.classList.contains('hidden');

    if (e.key === 'ArrowDown' && isOpen) {
      e.preventDefault();
      setActive(activeIndex + 1);
      return;
    }

    if (e.key === 'ArrowUp' && isOpen) {
      e.preventDefault();
      setActive(activeIndex - 1);
      return;
    }

    if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      hide();
      return;
    }

    if (e.key !== 'Enter') {
      return;
    }

    // Enter is overloaded, and which action fires has to match what the user
    // can see: a highlighted suggestion opens that item, nothing highlighted
    // sends the text to the AI as a new chat.
    if (activeIndex >= 0) {
      const item = items()[activeIndex];
      if (item) {
        e.preventDefault();
        onSelect(item.dataset.id);
        reset();
        return;
      }
    }

    const text = input.value.trim();
    if (!text) {
      return;
    }

    e.preventDefault();
    onAsk(text);
    reset();
  });

  // mousedown (not click) fires before the input's blur would hide the
  // dropdown, so the selection still registers.
  dropdown.addEventListener('mousedown', (e) => {
    const item = e.target.closest('.search-dropdown-item');
    if (!item) {
      return;
    }

    e.preventDefault();
    onSelect(item.dataset.id);
    reset();
  });

  input.addEventListener('blur', () => {
    setTimeout(hide, BLUR_HIDE_DELAY_MS);
  });
}
