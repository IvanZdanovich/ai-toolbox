// The shared/ module's public-entry allow-list and its reverse deny-rule.
//
// Allow-list: SHARED_PUBLIC_ENTRIES names the only paths external code may
// import. Reverse deny: everything else under shared/ is blocked for every
// directory in SHARED_CONSUMERS, so a consumer cannot reach past the entry
// point unnoticed.
//
// Both sides read their values from constraints/ rather than restating them.

import {
  SHARED_PUBLIC_ENTRIES,
  SHARED_CONSUMERS,
} from '../../chrome-extension/constraints/shared.constraints.js';

const message =
  "Import from 'shared/index.js' or 'shared/components/index.js' instead of reaching into shared/ internals.";

// One deny group per public entry: deny the directory it sits in, then
// re-allow only that entry.
const patterns = SHARED_PUBLIC_ENTRIES.map((entry) => ({
  group: [entry.replace(/index\.js$/, '*.js'), `!${entry}`],
  message,
}));

// no-restricted-imports only sees static imports, so a dynamic import()
// would otherwise slip straight past the patterns above.
// esquery ends the selector's regex literal at the first bare '/', so every
// dot and slash has to arrive escaped.
const allowed = SHARED_PUBLIC_ENTRIES.map((entry) =>
  entry.replace('../shared/', '').replace(/[./]/g, (c) => `\\${c}`)
).join('|');
const dynamicImport = `ImportExpression > Literal[value=/^\\.\\.\\/shared\\/(?!(?:${allowed})$).+/]`;

export default {
  files: SHARED_CONSUMERS,
  rules: {
    'no-restricted-imports': ['error', { patterns }],
    'no-restricted-syntax': ['error', { selector: dynamicImport, message }],
  },
};
