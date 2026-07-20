import { test, expect } from '@playwright/test';

test.describe('Continua OS Core Journeys', () => {
  test('should load the landing page and allow navigation to OS', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=The persistent')).toBeVisible();
    
    // Open OS
    await page.click('text=Open OS');
    
    // Depending on device, expect Desktop or Mobile Companion
    const isMobile = await page.evaluate(() => window.innerWidth < 768);
    if (isMobile) {
      await expect(page.locator('text=Companion')).toBeVisible();
    } else {
      await expect(page.locator('text=Command Center')).toBeVisible(); // Or some OS desktop element
    }
  });
});
