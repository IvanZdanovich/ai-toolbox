// Cross-functional: the released version is declared once in
// constraints/version.constraints.js. package.json and manifest.json cannot
// import JavaScript, so each carries a copy; this check is what keeps the
// copies honest.
//
// Origin: layout.adr-2 (REQUIREMENT_TRACE).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { EXTENSION_VERSION } from '../../chrome-extension/constraints/version.constraints.js';

const repoRoot = resolve(__dirname, '../..');

// Selector: every manifest at the repo root or the extension root that
// declares a "version" field.
const MANIFESTS = ['package.json', 'chrome-extension/manifest.json'];

describe('Version: Given the files matched by the selector "JSON manifests declaring a version field"', () => {
  it('Version: Then it matches at least every known manifest, or the selector is stale', () => {
    // EMPTY_RULE_GUARD: a renamed or moved manifest must fail loud, not
    // silently drop out of the check.
    expect(MANIFESTS.length).toBeGreaterThanOrEqual(2);
  });

  // CROSS_PER_TARGET_REPORT: one case per target, so a failure names the
  // offending file rather than just the requirement.
  it.each(MANIFESTS)(
    'Version: Then %s declares the same version as EXTENSION_VERSION',
    (manifestPath) => {
      const manifest = JSON.parse(
        readFileSync(resolve(repoRoot, manifestPath), 'utf8')
      );
      expect(manifest.version).toBe(EXTENSION_VERSION);
    }
  );
});
