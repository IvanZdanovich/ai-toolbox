---
paths:
  - 'reqs/browser/**/*.smoke.js'
  - 'reqs/support/chrome-cli.driver.js'
---

# Browser smoke checks

The only level that runs outside Vitest, in a real Chrome with the unpacked
extension installed, driven through the `chrome-devtools` CLI by Node's own
test runner (`npm run test:smoke`). It exists because jsdom doubles `chrome.*`
and resolves modules like a bundler, so no other level can fail for the reasons
an extension actually breaks on a user's machine (layout.adr-5).

SMOKE_FILENAME: names the file `reqs/browser/<flow>.smoke.js`, flat and named for the flow — `extension-loads.smoke.js`, `template-run.smoke.js` — never `.spec.js`, the suffix `vitest.config.js` collects at all four other levels and which Vitest would then try and fail to run against a browser it does not have — otherwise the file either drops out of every runner or lands in one that cannot execute it.
SMOKE_EARNS_THE_BROWSER: covers only what jsdom provably cannot — Chrome accepting `manifest.json`, a module specifier resolving against Chrome's loader rather than Vitest's, the service worker registering, a page booting with no console error, `chrome.storage.sync` persisting across a reopen — and sends anything else down to `reqs/e2e/` or lower — otherwise the slowest level in the project becomes its widest one.
SMOKE_IS_FEW: keeps the suite to load-bearing flows and to a runtime measured in seconds, since it is neither in `npm test` nor in CI and nobody waits on a check they have stopped running.
SMOKE_NO_KEY_NO_NETWORK: drives the demo provider and no configured one, so the run needs no API key and reaches no third party — and retries rather than asserting one attempt, because that provider fails one call in ten by design.
SMOKE_THROUGH_THE_DRIVER: reaches the browser only through `reqs/support/chrome-cli.driver.js`, never by shelling out to `chrome-devtools` from a case — otherwise every case encodes the CLI's output format and a CLI upgrade rewrites the suite.
SMOKE_SKIPS_WITHOUT_THE_CLI: skips itself when the CLI is absent rather than failing, so a machine without it is not a red build — the check is opt-in by nature.
SMOKE_RUNS_SERIALLY: runs with `--test-concurrency=1`, because `chrome-devtools start` restarts one shared daemon and a second file launching a browser kills the first file's — otherwise the suite fails with "Not connected" for reasons that have nothing to do with the extension.
DRIVER_STATES_NOTHING: keeps `chrome-cli.driver.js` free of assertions and requirements, exactly as `reqs/support/`'s other files are — it launches, installs, opens, evaluates and waits; the cases assert.

## Validation

SMOKE_SUFFIX_CHECK: every file under `reqs/browser/` ends in `.smoke.js`; none carries a Vitest-collected suffix, and `npx vitest list --filesOnly` names none of them.
SMOKE_JUSTIFICATION_CHECK: each case names, in its own words, what it catches that jsdom cannot; a case satisfiable in jsdom moves down a level.
SMOKE_RED_FIRST_CHECK: the suite has been observed failing against a break only a browser sees — renaming `sidepanel.html`'s `<script src>` to a missing file turns it red while `npm test` stays green.
SMOKE_NO_ASSERTION_IN_DRIVER_CHECK: `reqs/support/chrome-cli.driver.js` contains no `assert`, `it` or `test`.
