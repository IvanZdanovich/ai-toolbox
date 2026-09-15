/**
 * Named data for `reqs/e2e/template-lifecycle.e2e.spec.js`.
 *
 * Anything that exists because of a boundary is composed from
 * `chrome-extension/constraints/` rather than written out, so a changed cap
 * moves the example with it and the case keeps asserting the rule it was
 * written for (EXAMPLES_HOLD_DATA_ONLY). Descriptive copy — a template's name,
 * the sentence a user types into it — stays a literal.
 */

import { MAX_TEMPLATE_NAME_LENGTH } from '../../chrome-extension/constraints/template.constraints.js';

/** What the user writes: one template, one variable, prompt in their words. */
export const customerReplyTemplate = {
  name: 'Customer Reply',
  description: 'Answer a customer in their own tone',
  prompt: 'Write a reply to {customer_message}. Keep it short.',
};

/** The field the prompt above asks for, labelled as the run tab shows it. */
export const customerReplyInputs = {
  'Customer Message': 'My order arrived damaged and I would like a refund.',
};

/** A name one character past the cap, which the editor must not accept whole. */
export const templateNameOverTheLimit = 'N'.repeat(
  MAX_TEMPLATE_NAME_LENGTH + 1
);
