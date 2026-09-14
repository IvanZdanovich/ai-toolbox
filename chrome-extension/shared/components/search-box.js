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
  function hide() {
    dropdown.classList.add('hidden');
    input.setAttribute('aria-expanded', 'false');
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
        ({ id, title, meta }) => `
        <button type="button" class="search-dropdown-item" data-id="${sanitizeText(id)}" role="option">
          <span>${sanitizeText(title)}</span>
          ${meta ? `<span class="search-dropdown-item-meta">${sanitizeText(truncateText(meta, 60))}</span>` : ''}
        </button>
      `
      )
      .join('');
    dropdown.classList.remove('hidden');
    input.setAttribute('aria-expanded', 'true');
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
    if (e.key !== 'Enter') {
      return;
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
