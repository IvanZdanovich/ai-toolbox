// The spoken command grammar for the side panel. Kept separate from the DOM
// so the matching is a pure function the tests can drive with plain strings —
// sidepanel.js owns what each action actually does.

// Order matters: the specific phrases come before the catch-all
// "open <name>" / "search <text>" forms, so "open settings" is the settings
// page rather than a template that happens to be called Settings.
const COMMANDS = [
  {
    action: 'section',
    pattern: /^(?:go to |open |show )?(templates|workflows|history)$/,
  },
  { action: 'settings', pattern: /^(?:open |go to )?settings$/ },
  { action: 'new-template', pattern: /^(?:new|create|add) template$/ },
  { action: 'new-workflow', pattern: /^(?:new|create|add) workflow$/ },
  { action: 'new-chat', pattern: /^(?:new|start) chat$/ },
  { action: 'ask', pattern: /^ask (.+)$/ },
  { action: 'search', pattern: /^(?:search|find|filter)(?: for)? (.+)$/ },
  { action: 'edit', pattern: /^edit (.+)$/ },
  { action: 'open', pattern: /^(?:open|run|execute|start) (.+)$/ },
  { action: 'send', pattern: /^(?:send|submit)(?: it)?$/ },
  { action: 'close', pattern: /^close(?: tab| this)?$/ },
  { action: 'stop', pattern: /^stop(?: listening| voice)?$/ },
  { action: 'help', pattern: /^(?:help|what can i say)$/ },
];

export const VOICE_COMMAND_HELP = [
  '"templates" / "workflows" / "history" — switch section',
  '"new template" / "new workflow" / "new chat"',
  '"open <name>" / "edit <name>" — a template or workflow',
  '"search <text>" — filter the current section',
  '"ask <question>" — start a chat',
  '"send" — send the open chat message',
  '"close" — close the current tab',
  '"stop" — stop listening',
];

/**
 * @param {string} transcript What the recognizer heard.
 * @returns {{action: string, arg: string}|null} null when nothing matched.
 */
export function parseVoiceCommand(transcript) {
  const text = String(transcript || '')
    .toLowerCase()
    .trim()
    .replace(/[.,!?]+$/, '');

  for (const { action, pattern } of COMMANDS) {
    const match = text.match(pattern);
    if (match) {
      return { action, arg: (match[1] || '').trim() };
    }
  }

  return null;
}

function normalizeName(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Resolves a spoken name against templates/workflows. Recognizers drop
 * punctuation and casing and often hear a few words of a longer name, so an
 * exact match wins but a containment match is enough.
 *
 * @param {Array<{name: string}>} items
 * @param {string} spoken
 */
export function findByName(items, spoken) {
  const target = normalizeName(spoken);
  if (!target) {
    return null;
  }

  const named = items.map((item) => ({ item, name: normalizeName(item.name) }));
  const exact = named.find((entry) => entry.name === target);
  const partial = named.find(
    (entry) => entry.name.includes(target) || target.includes(entry.name)
  );

  return (exact || partial)?.item || null;
}
