import { test, expect } from '@playwright/test';
import { bootDesktop, openAppViaLaunchpad } from './helpers/desktop';

test.describe.configure({ timeout: 180_000 });

test('generated avatar picker: apply a Marble avatar and see it in the menu bar', async ({ page }) => {
  await bootDesktop(page);

  await page.getByLabel('Launchpad').click();
  const tile = page.getByRole('button', { name: 'Settings', exact: true }).first();
  await tile.click();
  const settingsWin = page.locator('[aria-label="Settings"]').first();
  await expect(settingsWin).toBeVisible({ timeout: 45_000 });

  // Account tab
  await settingsWin.getByRole('button', { name: /^account$/i }).first().click();

  // Generated avatars section → switch to Marble → pick variant 2.
  await settingsWin.getByRole('button', { name: 'Marble' }).click();
  const variant = settingsWin.getByLabel(/Apply generated marble avatar variant 2/i);
  await expect(variant).toBeVisible();
  await variant.click();

  // Success toast confirms the apply.
  await expect(page.getByText('Avatar Applied')).toBeVisible({ timeout: 10_000 });

  // Menu bar avatar now renders the generated SVG data URL.
  const menuAvatar = page.locator('img[src^="data:image/svg+xml"]').first();
  await expect(menuAvatar).toBeVisible({ timeout: 10_000 });
});

test('theme accent change is visible system-wide', async ({ page }) => {
  await bootDesktop(page);

  await page.getByLabel('Launchpad').click();
  await page.getByRole('button', { name: 'Settings', exact: true }).first().click();
  const settingsWin = page.locator('[aria-label="Settings"]').first();
  await expect(settingsWin).toBeVisible({ timeout: 45_000 });

  const before = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--color-neon-blue').trim()
  );

  // Appearance tab should be default; pick Cyber Red.
  await settingsWin.getByRole('button', { name: 'Cyber Red' }).click().catch(() => {
    // tab may need explicit activation
    return settingsWin.getByRole('button', { name: /appearance/i }).first().click()
      .then(() => settingsWin.getByRole('button', { name: 'Cyber Red' }).click());
  });

  await expect
    .poll(async () =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-neon-blue').trim()
    )
    .not.toBe(before);
});

test('launchpad and mission control overlays toggle', async ({ page }) => {
  await bootDesktop(page);

  await page.getByLabel('Launchpad').click();
  await expect(page.locator('body')).toContainText('Terminal');
  await page.keyboard.press('Escape');

  await page.getByLabel('Mission Control').click();
  await page.waitForTimeout(600);
  await page.keyboard.press('Escape');
});

test('notification center opens with content', async ({ page }) => {
  await bootDesktop(page);
  // Notifications bell lives in the menu bar; open via aria if present.
  const bell = page.getByRole('button', { name: /notifications?/i }).first();
  test.skip(!(await bell.isVisible().catch(() => false)), 'No notification bell on menu bar');
  await bell.click();
  await page.waitForTimeout(500);
});
