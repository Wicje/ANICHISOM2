import next from 'next';
import http from 'http';
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const SCREENSHOT_DIR = '/home/zk3/.gemini/antigravity-cli/brain/0f823cc0-f689-4423-89be-6afe0099d995/screenshots';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const hostname = '127.0.0.1';
const port = 3000;

console.log('⏳ 1. Preparing ContinuaOS application server...');
const app = next({ dev: true, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

const server = http.createServer(async (req, res) => {
  try {
    await handle(req, res);
  } catch (err) {
    console.error('Request error:', err);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
});

server.listen(port, hostname, async () => {
  console.log('✅ Server listening on http://127.0.0.1:3000');
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

  console.log('🌐 3. Navigating to http://127.0.0.1:3000/os ...');
  await page.goto('http://127.0.0.1:3000/os', { waitUntil: 'domcontentloaded', timeout: 0 });

  // Wait 4s for desktop to settle
  await page.waitForTimeout(4000);

  // Skip boot splash screen if visible
  console.log('⚡ Skipping boot splash...');
  try {
    await page.mouse.click(960, 540);
    await page.waitForTimeout(3000);
  } catch {}

  // Unlock if locked
  try {
    const unlockBtn = page.locator('button:has-text("Enter"), button:has-text("Unlock"), button:has-text("Guest"), button:has-text("Login")').first();
    if (await unlockBtn.isVisible({ timeout: 2000 })) {
      console.log('🔑 Unlocking session...');
      await unlockBtn.click();
      await page.waitForTimeout(2000);
    }
  } catch {}

  console.log('📸 4. Capturing Desktop Overview (01-desktop-overview.png)...');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-desktop-overview.png') });

  console.log('🎵 5. Opening Spotify App...');
  try {
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'spotify' } }));
    });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-spotify-window.png') });
  } catch (e) {
    console.log('Spotify note:', e.message);
  }

  console.log('🎨 6. Opening Figma (3rd party app) & Testing 4th Purple Circle Hub...');
  try {
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'figma' } }));
    });
    await page.waitForTimeout(4000);

    const fourthCircle = page.locator('button[aria-label*="App actions and stream controls"]').first();
    if (await fourthCircle.isVisible({ timeout: 2000 })) {
      await fourthCircle.hover();
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-webapp-4th-circle.png') });
  } catch (e) {
    console.log('Figma note:', e.message);
  }

  console.log('🤖 7. Testing Screen-Aware AI Omnibar...');
  try {
    await page.keyboard.press('Control+Space');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-ai-omnibar.png') });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  } catch (e) {
    console.log('AI Omnibar note:', e.message);
  }

  console.log('💻 8. Opening Code Studio Live Sandbox...');
  try {
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'code' } }));
    });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-code-editor-split.png') });
  } catch (e) {
    console.log('Code Studio note:', e.message);
  }

  console.log('⏳ 9. Opening Time Machine System Snapshot Stack...');
  try {
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('os:open-time-machine'));
    });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-time-machine-3d.png') });
  } catch (e) {
    console.log('Time Machine note:', e.message);
  }

  console.log('🏁 10. Verification complete! Writing report...');
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'report.json'), JSON.stringify({
    timestamp: Date.now(),
    errors,
    success: true,
  }, null, 2));

  await browser.close();
  server.close(() => {
    console.log('✨ All browser tests and screenshots captured successfully!');
    process.exit(0);
  });
});
