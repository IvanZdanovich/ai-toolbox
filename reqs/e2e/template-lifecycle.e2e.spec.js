/**
 * A template, from written to run to remembered — e2e.
 *
 * The one flow every other feature hangs off: a person opens the side panel,
 * writes a template, runs it against the demo provider, and finds the run in
 * their history after reopening the panel. It is driven entirely through the
 * shipped UI in a real Chrome — no module is imported, no storage is written
 * directly — so what it proves is that the assembled extension does what it
 * claims (E2E_NO_INTERNAL_REACH).
 *
 * The steps run in order against one open panel, the way a person works: each
 * `When` acts in its `beforeAll` and each `Then` only asserts on what the
 * panel now shows.
 *
 * Run with `npm run test:e2e`. Needs no API key and reaches no third party.
 *
 * Origin: layout.adr-5.
 */

import { expect, test } from '../support/playwright.driver.js';
import {
  sidePanel_ClearHistory,
  sidePanel_CreateTemplate,
  sidePanel_OpenSection,
  sidePanel_OpenTemplateEditor,
  sidePanel_OpenTemplateRun,
  templateRun_Execute,
  templateRun_FillInputs,
} from '../support/sidepanel.commands.js';
import {
  editorTab,
  sidePanel,
  templateEditor,
} from '../support/sidepanel.selectors.js';
import l10n from '../support/en.localization.js';
import { MAX_TEMPLATE_NAME_LENGTH } from '../../chrome-extension/constraints/template.constraints.js';
import {
  customerReplyInputs,
  customerReplyTemplate,
  templateNameOverTheLimit,
} from '../e2e-examples/template-lifecycle.examples.js';

test.describe.configure({ mode: 'serial' });

test.describe('TemplateLifecycle: Given a first-time user with the side panel open', () => {
  let panel;
  let answer;

  test.beforeAll(async ({ sidePanelPage }) => {
    panel = sidePanelPage;
  });

  test.describe('TemplateLifecycle: When the user writes a template and saves it', () => {
    test.beforeAll(async () => {
      await sidePanel_CreateTemplate(panel, customerReplyTemplate);
    });

    test('TemplateLifecycle: Then the template is in the library under the name they gave it', async () => {
      await expect(
        panel.locator(sidePanel.templates.cards, {
          hasText: customerReplyTemplate.name,
        })
      ).toHaveCount(1);
    });

    test('TemplateLifecycle: Then the panel confirms the template was created', async () => {
      await expect(panel.locator(sidePanel.toasts)).toContainText(
        l10n.toasts.templateCreated
      );
    });
  });

  test.describe('TemplateLifecycle: When the user opens that template and runs it on their own text', () => {
    test.beforeAll(async () => {
      await sidePanel_OpenTemplateRun(panel, customerReplyTemplate.name);
      await templateRun_FillInputs(panel, customerReplyInputs);
      answer = await templateRun_Execute(panel);
    });

    test('TemplateLifecycle: Then the run tab is titled after the template being run', async () => {
      await expect(
        panel.locator(`${editorTab.open} ${editorTab.title}`)
      ).toHaveText(
        `${l10n.templateRunner.titlePrefix}${customerReplyTemplate.name}`
      );
    });

    test('TemplateLifecycle: Then the panel shows an answer the user can read', () => {
      expect(answer?.trim().length).toBeGreaterThan(0);
    });
  });

  test.describe('TemplateLifecycle: When the user looks at their history', () => {
    test.beforeAll(async () => {
      await sidePanel_OpenSection(panel, 'history');
    });

    test('TemplateLifecycle: Then the run is listed against the template it came from', async () => {
      await expect(
        panel
          .locator(sidePanel.history.entries)
          .first()
          .locator(sidePanel.history.entry.title)
      ).toHaveText(customerReplyTemplate.name);
    });

    test('TemplateLifecycle: Then the run is marked completed', async () => {
      await expect(
        panel
          .locator(sidePanel.history.entries)
          .first()
          .locator(sidePanel.history.entry.status)
      ).toHaveText(l10n.history.statusCompleted);
    });
  });

  test.describe('TemplateLifecycle: When the user closes the side panel and opens it again', () => {
    let reopened;

    test.beforeAll(async ({ extensionContext, extensionId }) => {
      reopened = await extensionContext.newPage();
      await reopened.goto(
        `chrome-extension://${extensionId}/sidepanel/sidepanel.html`
      );
      await reopened.waitForFunction(() =>
        Boolean(window.aiToolboxSidePanel?.settings)
      );
    });

    test.afterAll(async () => {
      await reopened?.close();
    });

    test('TemplateLifecycle: Then the template they wrote is still in the library', async () => {
      await expect(
        reopened.locator(sidePanel.templates.cards, {
          hasText: customerReplyTemplate.name,
        })
      ).toHaveCount(1);
    });

    test('TemplateLifecycle: Then the run they made is still in their history', async () => {
      await sidePanel_OpenSection(reopened, 'history');
      await expect(
        reopened
          .locator(sidePanel.history.entries)
          .first()
          .locator(sidePanel.history.entry.title)
      ).toHaveText(customerReplyTemplate.name);
    });
  });

  test.describe('TemplateLifecycle: When the user clears the history', () => {
    test.beforeAll(async () => {
      await sidePanel_ClearHistory(panel);
    });

    test('TemplateLifecycle: Then the history reads as empty', async () => {
      await expect(panel.locator(sidePanel.history.empty)).toBeVisible();
    });
  });

  test.describe('TemplateLifecycle: When the user types a name longer than MAX_TEMPLATE_NAME_LENGTH', () => {
    test.beforeAll(async () => {
      await sidePanel_OpenTemplateEditor(panel, {
        name: templateNameOverTheLimit,
      });
    });

    test('TemplateLifecycle: Then the editor keeps only MAX_TEMPLATE_NAME_LENGTH characters of it', async () => {
      await expect(
        panel.locator(`${editorTab.open} ${templateEditor.name}`)
      ).toHaveValue('N'.repeat(MAX_TEMPLATE_NAME_LENGTH));
    });
  });
});
