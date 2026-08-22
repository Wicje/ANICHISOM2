import http from 'http';
import next from 'next';
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = '/home/zk3/.gemini/antigravity-cli/brain/0f823cc0-f689-4423-89be-6afe0099d995';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'playwright_inspection');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function run() {
  console.log('🚀 1. Starting Next.js app...');
  const app = next({ dev: true, hostname: '127.0.0.1', port: 3000, turbo: true });
  const handle = app.getRequestHandler();
  await app.prepare();

  const server = http.createServer((req, res) => handle(req, res));
  await new Promise((resolve) => server.listen(3000, '127.0.0.1', resolve));
  console.log('✅ Server listening on 127.0.0.1:3000');

  console.log('🚀 2. Launching Playwright Chromium...');
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process',
      '--no-zygote',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  console.log('📍 3. Navigating to /os ...');
  await page.goto('http://127.0.0.1:3000/os', { waitUntil: 'load', timeout: 180000 });
  console.log('✨ Page loaded! Waiting for desktop elements...');
  await page.waitForTimeout(6000);

  // Take screenshot 1
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'fast_01_loaded.png') });
  console.log('📸 Captured fast_01_loaded.png');

  // Dismiss splash
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);
  await page.mouse.click(720, 450);
  await page.waitForTimeout(2000);

  try {
    const unlock = page.locator('button:has-text("Enter"), button:has-text("Unlock"), button:has-text("Guest"), button:has-text("Login")').first();
    if (await unlock.isVisible({ timeout: 2000 })) {
      await unlock.click();
      await page.waitForTimeout(2000);
    }
  } catch {}

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'fast_02_desktop.png') });
  console.log('📸 Captured fast_02_desktop.png');

  // Open Finder
  console.log('📁 4. Launching Finder...');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'finder' } })));
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'fast_03_finder.png') });
  console.log('📸 Captured fast_03_finder.png');

  // Open Moodboard
  console.log('🎨 5. Launching Moodboard...');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'moodboard' } })));
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'fast_04_moodboard.png') });
  console.log('📸 Captured fast_04_moodboard.png');

  // Open CampaignLab
  console.log('📊 6. Launching CampaignLab...');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'campaign-lab' } })));
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'fast_05_campaignlab.png') });
  console.log('📸 Captured fast_05_campaignlab.png');

  // Trigger Omnibar
  console.log('💡 7. Triggering AI Omnibar...');
  await page.keyboard.press('Control+Space');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'fast_06_omnibar.png') });
  console.log('📸 Captured fast_06_omnibar.png');

  console.log('🎉 SUCCESS! Captured all screenshots in playwright_inspection directory.');

  await browser.close();
  server.close(() => process.exit(0));
}

run().catch((err) => {
  console.error('Fast run failed:', err);
  process.exit(1);
});
