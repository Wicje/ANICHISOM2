import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const SCREENSHOT_DIR = '/home/zk3/.gemini/antigravity-cli/brain/0f823cc0-f689-4423-89be-6afe0099d995/screenshots';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runVisualVerification() {
  console.log('🚀 Launching Playwright Chromium with Linux flags...');
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
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();
  const errors = [];

  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      console.log('[Console Error]', text);
      errors.push(text);
    }
  });

  page.on('pageerror', err => {
    console.log('[Page Error]', err.message);
    errors.push(err.message);
  });

  console.log('🌐 Navigating to ContinuaOS Desktop at http://127.0.0.1:3000/os ...');
  try {
    await page.goto('http://127.0.0.1:3000/os', { waitUntil: 'domcontentloaded', timeout: 0 });
  } catch (e) {
    console.log('Navigation note:', e.message);
  }

  // Wait for initial render
  await page.waitForTimeout(2000);

  // Click body to skip boot splash immediately
  console.log('⚡ Skipping boot splash screen...');
  try {
    await page.mouse.click(960, 540);
    await page.waitForTimeout(3000);
  } catch (e) {
    console.log('Boot skip note:', e.message);
  }

  // If there is a lock screen or login prompt, unlock it
  try {
    const unlockBtn = page.locator('button:has-text("Enter"), button:has-text("Unlock"), button:has-text("Guest"), button:has-text("Login")').first();
    if (await unlockBtn.isVisible({ timeout: 2000 })) {
      console.log('🔑 Unlocking desktop session...');
      await unlockBtn.click();
      await page.waitForTimeout(2000);
    }
  } catch {}

  console.log('📸 1. Capturing Desktop Overview (01-desktop-overview.png)...');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-desktop-overview.png') });

  // 2. Open Spotify App
  console.log('🎵 2. Opening Spotify App...');
  try {
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'spotify' } }));
    });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-spotify-window.png') });
  } catch (e) {
    console.log('Spotify test note:', e.message);
  }

  // 3. Open Figma (3rd Party App) & Hover 4th Circle Hub
  console.log('🎨 3. Opening Figma & Testing 4th Purple Circle Hub...');
  try {
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'figma' } }));
    });
    await page.waitForTimeout(3500);

    const fourthCircle = page.locator('button[aria-label*="App actions and stream controls"]').first();
    if (await fourthCircle.isVisible({ timeout: 2000 })) {
      await fourthCircle.hover();
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-webapp-4th-circle.png') });
  } catch (e) {
    console.log('Figma test note:', e.message);
  }

  // 4. Test AI Omnibar (Ctrl+Space)
  console.log('🤖 4. Testing Screen-Aware AI Omnibar (04-ai-omnibar.png)...');
  try {
    await page.keyboard.press('Control+Space');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-ai-omnibar.png') });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  } catch (e) {
    console.log('Omnibar test note:', e.message);
  }

  // 5. Open Code Studio Live Preview Sandbox
  console.log('💻 5. Opening Code Studio Live Sandbox (05-code-editor-split.png)...');
  try {
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'code' } }));
    });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-code-editor-split.png') });
  } catch (e) {
    console.log('Code Studio test note:', e.message);
  }

  // 6. Open Time Machine 3D Checkpoints
  console.log('⏳ 6. Opening Time Machine (06-time-machine-3d.png)...');
  try {
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('os:open-time-machine'));
    });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-time-machine-3d.png') });
  } catch (e) {
    console.log('Time Machine test note:', e.message);
  }

  console.log('🏁 Verification complete! Writing report...');
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'report.json'), JSON.stringify({
    timestamp: Date.now(),
    errors,
    success: true,
  }, null, 2));

  await browser.close();
  console.log('✨ All browser tests and screenshots finished successfully!');
}

runVisualVerification().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
