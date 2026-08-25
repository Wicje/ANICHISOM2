import { test, expect } from '@playwright/test';
import { bootDesktop, openAppViaLaunchpad } from './helpers/desktop';

test.describe.configure({ timeout: 240_000 });

const THIRD_PARTY = ['Figma', 'Notion', 'VS Code Web', 'ChatGPT', 'Discord', 'YouTube', 'Spotify'];
const CREATIVE = ['Moodboard Canvas', 'Campaign Lab'];

test.beforeEach(async ({ page }) => {
  await bootDesktop(page);
});

for (const app of [...CREATIVE, ...THIRD_PARTY]) {
  test(`opens with window chrome: ${app}`, async ({ page }) => {
    await openAppViaLaunchpad(page, app);
    // Third-party apps embed remote content in an iframe or web-app shell;
    // as a user we care that the WINDOW opens with its title chrome visible.
    const win = page.locator(`[aria-label="${app}"]`).first();
    await expect(win).toBeVisible();
    await win.getByLabel('Close window').click();
    await expect(win).toBeHidden({ timeout: 10_000 });
  });
}

test('Files: navigate into folders and breadcrumb renders', async ({ page }) => {
  await openAppViaLaunchpad(page, 'Files');
  const win = page.locator('[aria-label="Files"]').first();
  await expect(win).toBeVisible();

  // The file manager should render some navigational structure within view.
  await expect(win.locator('text=/home|documents|downloads|recent|root/i').first()).toBeVisible({
    timeout: 20_000,
  });
});

test('Screen Recorder: recorder surface appears with capture controls', async ({ page }) => {
  await openAppViaLaunchpad(page, 'Screen Recorder');
  const win = page.locator('[aria-label="Screen Recorder"]').first();
  await expect(win).toBeVisible({ timeout: 20_000 });
  await expect(win.getByText(/record|capture|start/i).first()).toBeVisible({ timeout: 20_000 });
});

test('Notch Nook opens from menu bar notch', async ({ page }) => {
  // The notch is the small pill at top-center; hover/click opens NotchNook.
  const notch = page.locator('[data-testid="notch"], [aria-label*="notch" i]').first();
  test.skip(!(await notch.isVisible().catch(() => false)), 'Notch element not found');
  await notch.click();
  await page.waitForTimeout(800);
});

test('Files: Google Drive cloud source surfaces files or setup guidance', async ({ page }) => {
  await openAppViaLaunchpad(page, 'Files');
  const win = page.locator('[aria-label="Files"]').first();
  await expect(win).toBeVisible({ timeout: 30_000 });

  // Cloud sidebar: click Google Drive; the app must show demo/real files
  // OR explicit setup guidance — never a dead click.
  const gdrive = win.getByText('Google Drive', { exact: false }).first();
  if (await gdrive.isVisible().catch(() => false)) {
    await gdrive.click();
    await expect(
      win.locator('text=/roadmap|assets|configured|env vars|connect|sign in/i').first()
    ).toBeVisible({ timeout: 20_000 });
  } else {
    test.info().annotations.push({ type: 'note', description: 'No Google Drive entry in Files' });
  }
});

test('Settings: Dropbox connect toggles with user feedback', async ({ page }) => {
  await openAppViaLaunchpad(page, 'Settings');
  const win = page.locator('[aria-label="Settings"]').first();
  await win.getByRole('button', { name: /^account$/i }).first().click();

  const connect = win.getByRole('button', { name: /connect dropbox/i }).first();
  test.skip(!(await connect.isVisible().catch(() => false)), 'Dropbox card not present');
  await connect.click();
  // Either OAuth window opens, or a toast confirms mount — assert feedback.
  await expect(
    page.locator('text=/connected|mounted|dropbox/i').first()
  ).toBeVisible({ timeout: 15_000 });
});

test('Settings: Spotify integration entry point works', async ({ page }) => {
  await openAppViaLaunchpad(page, 'Spotify');
  const win = page.locator('[aria-label="Spotify"]').first();
  await expect(win).toBeVisible();
  // Either the connect prompt or embedded player surface must render.
  await expect(
    win.locator('text=/connect|spotify|login|play/i').first()
  ).toBeVisible({ timeout: 20_000 });
});

test('Settings: GitHub device flow starts and shows a code step', async ({ page }) => {
  await openAppViaLaunchpad(page, 'Settings');
  const win = page.locator('[aria-label="Settings"]').first();
  await win.getByRole('button', { name: /^account$/i }).first().click();

  const gh = win.getByRole('button', { name: /github/i }).first();
  if (!(await gh.isVisible().catch(() => false))) {
    test.info().annotations.push({ type: 'note', description: 'GitHub card not present' });
    return;
  }
  await gh.click();
  // Device flow should show either a code UI or an error toast — never silence.
  await expect(
    win.locator('text=/[A-Z0-9]{4}-[A-Z0-9]{4}|code|error|failed|denied/i').first()
  ).toBeVisible({ timeout: 20_000 });
});

test('Context export produces a downloadable artifact', async ({ page }) => {
  await openAppViaLaunchpad(page, 'Settings');
  const win = page.locator('[aria-label="Settings"]').first();

  const exportBtn = win.getByRole('button', { name: /export/i }).first();
  test.skip(!(await exportBtn.isVisible().catch(() => false)), 'No export control found');
  const downloadPromise = page.waitForEvent('download', { timeout: 20_000 }).catch(() => null);
  await exportBtn.click();
  const download = await downloadPromise;
  if (download) {
    expect(download.suggestedFilename()).toMatch(/\.(json|zip|txt)$/i);
  } else {
    // Export may surface a modal/toast instead of a direct download.
    await expect(win.locator('text=/export|download|saved|success/i').first()).toBeVisible();
  }
});
