// File-size ceiling, scoped to the directories it is already green in.
// Both the threshold and the scope come from constraints/ so the rule holds
// no literals of its own.

import {
  MAX_FILE_LINES,
  MAX_FILE_LINES_SCOPE,
} from '../../chrome-extension/constraints/complexity.constraints.js';

export default {
  files: MAX_FILE_LINES_SCOPE,
  rules: {
    'max-lines': [
      'error',
      { max: MAX_FILE_LINES, skipBlankLines: false, skipComments: false },
    ],
  },
};
