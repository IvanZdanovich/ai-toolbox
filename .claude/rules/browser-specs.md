---
paths:
  - 'reqs/browser/**/*.smoke.js'
  - 'reqs/support/chrome-cli.driver.js'
---

# Browser smoke checks

# Reasoning Principles

SMOKE_EXISTS_FOR_REAL_CHROME: runs in a real Chrome with the unpacked extension installed, driven through the `chrome-devtools` CLI by Node's test runner (`npm run test:smoke`), over Vitest, which has no browser here — otherwise every level doubles `chrome.*` and resolves modules like a bundler, and none can fail for the reasons an extension actually breaks on a user's machine.
SMOKE_EARNS_THE_BROWSER: covers only what jsdom cannot — Chrome accepting `manifest.json`, a module specifier resolving against Chrome's loader rather than Vitest's, the service worker registering, a page booting with no console error, `chrome.storage.sync` persisting across a reopen — and sends anything else down to `reqs/e2e/` or lower — otherwise the slowest level in the project becomes its widest one.
SMOKE_STAYS_UNDER_A_MINUTE: keeps the suite to load-bearing flows and its whole run under a minute, since it is in neither `npm test` nor CI — otherwise it grows past the point where anyone runs it by hand, and stops being a check at all.
SMOKE_USES_THE_DEMO_PROVIDER: drives the demo provider over a configured one, so the run needs no API key and reaches no third party — otherwise the only check that touches a real browser also depends on a secret and someone else's uptime.
SMOKE_RETRIES_THE_DEMO_PROVIDER: retries a provider call over asserting on one attempt, because the demo provider fails one call in ten by design — otherwise the suite goes red for a fault it was built to tolerate.
SMOKE_SKIPS_WITHOUT_THE_CLI: skips itself when the CLI is absent over failing — otherwise a machine without an opt-in tool reports a red build it cannot fix.

# Output Shape

SMOKE_FILENAME: names the file `reqs/browser/<flow>.smoke.js`, flat and named for the flow — `extension-loads.smoke.js`, `template-run.smoke.js` — never `.spec.js`, which `vitest.config.js` collects at all four other levels — otherwise the file either drops out of every runner or lands in one that cannot execute it.
SMOKE_THROUGH_THE_DRIVER: reaches the browser only through `reqs/support/chrome-cli.driver.js`, over shelling out to `chrome-devtools` from a case — otherwise every case encodes the CLI's output format and a CLI upgrade rewrites the suite.
DRIVER_STATES_NOTHING: keeps `chrome-cli.driver.js` to launching, installing, opening, evaluating and waiting, exactly as `reqs/support/`'s other files are — the cases assert.
SMOKE_RUNS_SERIALLY: runs with `--test-concurrency=1`, since `chrome-devtools start` restarts one shared daemon and a second file launching a browser kills the first file's — otherwise the suite fails with "Not connected" for reasons that have nothing to do with the extension.

# Validation

SMOKE_SUFFIX_CHECK: every file under `reqs/browser/` ends in `.smoke.js`, and `npx vitest list --filesOnly` names none of them.
SMOKE_JUSTIFICATION_CHECK: each case names, in its own words, what it catches that jsdom cannot; a case satisfiable in jsdom moves down a level.
SMOKE_RED_FIRST_CHECK: the suite has been seen failing against a break only a browser sees — renaming `sidepanel.html`'s `<script src>` to a missing file turns it red while `npm test` stays green.
SMOKE_NO_ASSERTION_IN_DRIVER_CHECK: `reqs/support/chrome-cli.driver.js` contains no `assert`, `it` or `test`.
