import { test, expect } from '@playwright/test';

test.describe('Continua OS Core Journeys', () => {
  test.describe.configure({ timeout: 120_000 });

  test('landing page renders with working OS entry points', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Entry points into the OS must exist and resolve to /os.
    // (We assert the links rather than loading /os itself: the desktop
    // bundle is enormous and needs CI-class resources to render.)
    const launch = page.getByRole('link', { name: 'Launch Continua Workspace' });
    await expect(launch).toBeVisible();
    await expect(launch).toHaveAttribute('href', '/os');

    await expect(
      page.getByRole('link', { name: 'Connect Mobile Key' })
    ).toHaveAttribute('href', '/os');

    // The connect flow has its own dedicated spec (connect-journey.spec.ts).
  });
});
