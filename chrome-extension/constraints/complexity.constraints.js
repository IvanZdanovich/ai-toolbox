// Cross-functional code-writing boundaries, read by the rules under
// reqs/rules rather than hardcoded in any lint config.

// Above this a file is split before its logic is edited (COMPLEXITY_PRECHECK).
export const MAX_FILE_LINES = 400;

// Directories the max-lines rule is enforced in. Expanded one directory at a
// time, each only once it is green (BOUNDARY_ROLLOUT).
export const MAX_FILE_LINES_SCOPE = [
  'chrome-extension/shared/components/**/*.js',
];
