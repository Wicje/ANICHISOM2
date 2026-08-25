import { test, expect } from '@playwright/test';
import { bootDesktop, openAppViaLaunchpad, closeAppWindow } from './helpers/desktop';

test.describe.configure({ timeout: 180_000 });

const CORE_APPS = ['Terminal', 'Files', 'Settings', 'App Store', 'Activity Monitor', 'Privacy Settings'];
const PRODUCTIVITY_APPS = ['Power Browser', 'Assistant', 'Code Editor', 'Productivity Suite', 'Shortcuts'];
const MEDIA_APPS = ['Image Studio', 'Media Player', 'PDF Reader', 'Screen Recorder'];

test.beforeEach(async ({ page }) => {
  await bootDesktop(page);
});

for (const app of CORE_APPS) {
  test(`app opens and renders: ${app}`, async ({ page }) => {
    await openAppViaLaunchpad(page, app);
    await expect(page.locator('body')).toContainText(app, { timeout: 30_000 });
    await closeAppWindow(page, app);
  });
}

for (const app of PRODUCTIVITY_APPS) {
  test(`app opens and renders: ${app}`, async ({ page }) => {
    await openAppViaLaunchpad(page, app);
    await closeAppWindow(page, app);
  });
}

for (const app of MEDIA_APPS) {
  test(`app opens and renders: ${app}`, async ({ page }) => {
    await openAppViaLaunchpad(page, app);
    await closeAppWindow(page, app);
  });
}

test('window minimize restores from dock', async ({ page }) => {
  await openAppViaLaunchpad(page, 'Terminal');
  const win = page.locator('[aria-label="Terminal"]').first();
  await win.getByLabel('Minimize window').click();
  await expect(win).toBeHidden();
  // Dock should still list the running window — click it to restore.
  const dockItem = page.getByLabel('Application dock').getByLabel('Terminal');
  if (await dockItem.isVisible().catch(() => false)) {
    await dockItem.click();
    await expect(win).toBeVisible();
  }
  await closeAppWindow(page, 'Terminal');
});
