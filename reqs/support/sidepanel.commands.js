/**
 * The side panel's UI commands — the multi-step things a user does, each one
 * named after the deed rather than the clicks it takes: open a section, write
 * a template, run the open one, clear the history.
 *
 * A case calls these and asserts on what the user then sees, so the sequence
 * of clicks lives in one place and a case stays a statement about the flow
 * (E2E_SEEDS_THROUGH_SUPPORT). Nothing here asserts a requirement; a command
 * waits for the UI to settle and returns what the case needs to assert on
 * (SUPPORT_NOT_SPEC).
 */

import { MOCK_FAILURE_RATE } from '../../chrome-extension/constraints/provider.constraints.js';
import {
  confirmModal,
  editorTab,
  sidePanel,
  templateEditor,
  templateRunner,
} from './sidepanel.selectors.js';
import l10n from './en.localization.js';

// The demo provider fails MOCK_FAILURE_RATE of its calls on purpose, so one
// attempt is not a signal. Retry until an all-failing run is rarer than one in
// a thousand, rather than picking a number by feel.
const ACCEPTABLE_FLAKE = 1 / 1000;
const RUN_ATTEMPTS = Math.ceil(
  Math.log(ACCEPTABLE_FLAKE) / Math.log(MOCK_FAILURE_RATE)
);

/** Brings one of the three main sections to the front. */
export async function sidePanel_OpenSection(page, section) {
  await page.click(sidePanel.sections[section]);
  await page.waitForSelector(`#${section}.section.active`);
}

/**
 * Writes a template through the editor the way a user does — New Template,
 * fill the form, Save — and returns once the library shows it.
 */
export async function sidePanel_CreateTemplate(page, template) {
  await sidePanel_OpenSection(page, 'templates');
  await page.click(sidePanel.templates.create);
  await page.waitForSelector(`${editorTab.open} ${templateEditor.form}`);

  await page.fill(`${editorTab.open} ${templateEditor.name}`, template.name);
  if (template.description) {
    await page.fill(
      `${editorTab.open} ${templateEditor.description}`,
      template.description
    );
  }
  await page.fill(
    `${editorTab.open} ${templateEditor.prompt}`,
    template.prompt
  );
  await page.click(`${editorTab.open} ${templateEditor.save}`);

  await sidePanel_OpenSection(page, 'templates');
  await page.waitForSelector(
    `${sidePanel.templates.cards}:has-text("${template.name}")`
  );
}

/** Types into the name field without saving, for the cases about its cap. */
export async function sidePanel_OpenTemplateEditor(page, { name } = {}) {
  await sidePanel_OpenSection(page, 'templates');
  await page.click(sidePanel.templates.create);
  await page.waitForSelector(`${editorTab.open} ${templateEditor.form}`);
  if (name !== undefined) {
    await page.fill(`${editorTab.open} ${templateEditor.name}`, name);
  }
}

/** Opens a template's run tab by clicking its card, as a user does. */
export async function sidePanel_OpenTemplateRun(page, name) {
  await sidePanel_OpenSection(page, 'templates');
  await page.click(`${sidePanel.templates.cards}:has-text("${name}")`);
  await page.waitForSelector(`${editorTab.open} ${templateRunner.form}`);
  await page.waitForFunction(
    ([selector, prefix]) =>
      document.querySelector(selector)?.textContent.startsWith(prefix),
    [`${editorTab.open} ${editorTab.title}`, l10n.templateRunner.titlePrefix]
  );
}

/** Fills the open run tab's fields, addressed by the label a user reads. */
export async function templateRun_FillInputs(page, values) {
  for (const [label, value] of Object.entries(values)) {
    await page.fill(
      `${editorTab.open} ${templateRunner.inputs} textarea[aria-label="${label}"]`,
      value
    );
  }
}

/**
 * Presses Run on the open tab and returns the answer the panel shows, retrying
 * the demo provider's deliberate failures. Returns null if every attempt fails.
 */
export async function templateRun_Execute(page) {
  for (let attempt = 0; attempt < RUN_ATTEMPTS; attempt++) {
    await page.click(`${editorTab.open} ${templateRunner.run}`);

    const settled = await page.waitForFunction(
      ([openTab, result, error]) => {
        const shown = (selector) => {
          const el = document.querySelector(`${openTab} ${selector}`);
          return el && !el.classList.contains('hidden');
        };
        if (shown(result)) {
          return 'result';
        }
        return shown(error) ? 'error' : null;
      },
      [editorTab.open, templateRunner.result, templateRunner.error],
      { timeout: 30000 }
    );

    if ((await settled.jsonValue()) === 'result') {
      return page.textContent(
        `${editorTab.open} ${templateRunner.resultContent}`
      );
    }
  }
  return null;
}

/** Empties the history through the UI, confirming the dialog it raises. */
export async function sidePanel_ClearHistory(page) {
  await sidePanel_OpenSection(page, 'history');
  await page.click(sidePanel.history.clear);
  await page.click(`${confirmModal.overlay} ${confirmModal.confirm}`);
  await page.waitForSelector(sidePanel.history.empty, { state: 'visible' });
}
