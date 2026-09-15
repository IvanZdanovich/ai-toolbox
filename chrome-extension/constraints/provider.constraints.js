// Boundaries owned by the demo ("mock") provider — the one the extension
// falls back to with no API key configured, and the only one the e2e suite
// is allowed to reach.

// Share of demo-provider calls that fail on purpose, so the shipped error
// handling is visible without a real provider. Anything driving the demo
// provider has to tolerate it rather than assert on a single attempt.
export const MOCK_FAILURE_RATE = 0.1;
