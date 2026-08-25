import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Boots the full desktop as a real user would and returns once the
 * desktop shell (menu bar) is interactive.
 */
export async function bootDesktop(page: Page): Promise<void> {
  await page.goto('/os');

  // Boot splash: dismiss like a user (click anywhere) — auto-skips at 3.5s anyway.
  await page.waitForTimeout(500);
  const splashGone = page
    .locator('h1')
    .filter({ hasText: /continua/i })
    .or(page.locator('body'))
    .first();
  await splashGone.click({ force: true }).catch(() => {});

  // First-run onboarding wizard → Skip.
  const skip = page.getByRole('button', { name: 'Skip' });
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
  }

  // Login screen → local E2E entry point.
  const local = page.getByTestId('e2e-local-login');
  await expect(local).toBeVisible({ timeout: 30_000 });
  await local.click();

  // Desktop is up when the dock exists.
  await expect(page.getByLabel('Application dock')).toBeVisible({ timeout: 60_000 });
}

/** Opens an app by its Launchpad tile name and asserts its window appears. */
export async function openAppViaLaunchpad(page: Page, title: string): Promise<void> {
  await page.getByLabel('Launchpad').click();
  const tile = page.getByRole('button', { name: title, exact: true }).first();
  await expect(tile).toBeVisible({ timeout: 15_000 });
  await tile.click();
  await expect(page.locator(`[aria-label="${title}"]`).first()).toBeVisible({ timeout: 45_000 });
}

/** Closes the frontmost window of the given app via its close button. */
export async function closeAppWindow(page: Page, title: string): Promise<void> {
  const win = page.locator(`[aria-label="${title}"]`).first();
  await win.getByLabel('Close window').click();
  await expect(win).toBeHidden({ timeout: 10_000 });
}
