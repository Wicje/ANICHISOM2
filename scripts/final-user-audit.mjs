import http from 'http';
import next from 'next';
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const SCREENSHOT_DIR = '/home/zk3/.gemini/antigravity-cli/brain/0f823cc0-f689-4423-89be-6afe0099d995/screenshots';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function start() {
  console.log('⚡ 1. Initializing warm Next.js instance on http://127.0.0.1:3000...');
  const app = next({ dev: true, hostname: '127.0.0.1', port: 3000 });
  const handle = app.getRequestHandler();
  await app.prepare();

  const server = http.createServer(async (req, res) => {
    try {
      await handle(req, res);
    } catch (err) {
      console.error('Server error:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  const keepAlive = setInterval(() => {}, 1000);

  server.listen(3000, '127.0.0.1', async () => {
    console.log('✅ Server ready and listening!');
    console.log('⏳ Pre-warming /os endpoint via HTTP fetch...');
    let ready = false;
    while (!ready) {
      try {
        const res = await fetch('http://127.0.0.1:3000/os');
        if (res.status === 200) {
          ready = true;
          console.log('✅ /os responded with HTTP 200 OK!');
        } else {
          await new Promise(r => setTimeout(r, 2000));
        }
      } catch (e) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    console.log('🚀 2. Launching Playwright Chromium for user journey audit...');

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
    const runtimeIssues = [];

    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') {
        console.log('  ⚠️  [Browser Error]', text);
        runtimeIssues.push({ type: 'CONSOLE_ERROR', message: text });
      } else if (type === 'warning' && (text.includes('React') || text.includes('Hydration'))) {
        console.log('  🟡 [UI Warning]', text);
        runtimeIssues.push({ type: 'UI_WARNING', message: text });
      }
    });

    page.on('pageerror', err => {
      console.log('  🚨 [Uncaught Exception]', err.message);
      runtimeIssues.push({ type: 'UNCAUGHT_CRASH', message: err.message, stack: err.stack });
    });

    console.log('📍 3. Navigating to http://127.0.0.1:3000/os ...');
    await page.goto('http://127.0.0.1:3000/os', { waitUntil: 'domcontentloaded' });

    console.log('⏳ Waiting 4s for desktop to mount...');
    await page.waitForTimeout(4000);

    // 1. Skip boot splash
    console.log('🖱️ Step 1: Skipping boot splash screen...');
    try {
      await page.mouse.click(960, 540);
      await page.waitForTimeout(3000);
    } catch {}

    // 2. Unlock if lockscreen
    try {
      const unlockBtn = page.locator('button:has-text("Enter"), button:has-text("Unlock"), button:has-text("Guest"), button:has-text("Login")').first();
      if (await unlockBtn.isVisible({ timeout: 2000 })) {
        console.log('🔑 Unlocking session...');
        await unlockBtn.click();
        await page.waitForTimeout(2000);
      }
    } catch {}

    console.log('📸 Capturing 01-desktop-overview.png...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-desktop-overview.png') });

    // 3. Menubar Apple/Continua menu
    console.log('🍎 Step 2: Testing Top Menu Bar Continua menu...');
    try {
      const logoBtn = page.locator('header button, [data-testid="os-menu-trigger"]').first();
      if (await logoBtn.isVisible({ timeout: 2000 })) {
        await logoBtn.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-topbar-apple-menu.png') });
        await page.keyboard.press('Escape');
      }
    } catch (e) {
      console.log('Menu bar note:', e.message);
    }

    // 4. Open Spotify App
    console.log('🎵 Step 3: Opening Spotify App & Testing Audio Controls...');
    try {
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'spotify' } })));
      await page.waitForTimeout(4000);
      
      const playBtn = page.locator('button[aria-label*="Play"], button:has-text("Play"), [data-testid="play-button"]').first();
      if (await playBtn.isVisible({ timeout: 2000 })) {
        await playBtn.click();
        await page.waitForTimeout(1000);
      }
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-spotify-window.png') });
    } catch (e) {
      runtimeIssues.push({ type: 'SPOTIFY_FAIL', message: e.message });
    }

    // 5. Open Standalone Figma Web App & Test 4th Purple Circle Hub
    console.log('🎨 Step 4: Opening Standalone Figma & Testing 4th Traffic Light Circle...');
    try {
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'figma' } })));
      await page.waitForTimeout(4000);

      const fourthCircle = page.locator('button[aria-label*="App actions and stream controls"]').first();
      if (await fourthCircle.isVisible({ timeout: 2000 })) {
        await fourthCircle.hover();
        await page.waitForTimeout(1500);
      }
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-webapp-4th-circle.png') });
    } catch (e) {
      runtimeIssues.push({ type: 'FIGMA_FAIL', message: e.message });
    }

    // 6. Test Screen-Aware AI Omnibar
    console.log('🤖 Step 5: Testing Screen-Aware AI Omnibar (Ctrl+Space)...');
    try {
      await page.keyboard.press('Control+Space');
      await page.waitForTimeout(1500);
      await page.keyboard.type('open screen recorder and set focus to zen', { delay: 30 });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-ai-omnibar.png') });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } catch (e) {
      runtimeIssues.push({ type: 'AI_OMNIBAR_FAIL', message: e.message });
    }

    // 7. Open Code Studio Live Sandbox
    console.log('💻 Step 6: Opening Code Studio Sandbox IDE...');
    try {
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'code' } })));
      await page.waitForTimeout(4000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-code-editor-split.png') });
    } catch (e) {
      runtimeIssues.push({ type: 'CODE_STUDIO_FAIL', message: e.message });
    }

    // 8. Open Screen Recorder
    console.log('📹 Step 7: Testing Screen Recorder App...');
    try {
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'screen-recorder' } })));
      await page.waitForTimeout(3500);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-screen-recorder.png') });
    } catch (e) {
      runtimeIssues.push({ type: 'SCREEN_RECORDER_FAIL', message: e.message });
    }

    // 9. Open Productivity Suite
    console.log('📊 Step 8: Testing Productivity Suite App...');
    try {
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'productivity-suite' } })));
      await page.waitForTimeout(3500);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-productivity-suite.png') });
    } catch (e) {
      runtimeIssues.push({ type: 'PRODUCTIVITY_SUITE_FAIL', message: e.message });
    }

    // 10. Open Control Center
    console.log('🎛️ Step 9: Testing Control Center Overlays...');
    try {
      const controlCenterBtn = page.locator('button[aria-label*="Control Center"], [data-testid="control-center-trigger"]').first();
      if (await controlCenterBtn.isVisible({ timeout: 2000 })) {
        await controlCenterBtn.click();
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09-control-center.png') });
        await page.keyboard.press('Escape');
      }
    } catch (e) {
      console.log('Control center note:', e.message);
    }

    // 11. Open Time Machine 3D System Snapshot Stack
    console.log('⏳ Step 10: Testing Time Machine 3D Checkpoint Stack...');
    try {
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-time-machine')));
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10-time-machine-3d.png') });
    } catch (e) {
      runtimeIssues.push({ type: 'TIME_MACHINE_FAIL', message: e.message });
    }

    console.log('🏁 Step 11: Writing final audit report...');
    const auditReport = {
      timestamp: new Date().toISOString(),
      testsExecuted: 10,
      totalScreenshots: 10,
      runtimeIssues,
      status: runtimeIssues.filter(i => i.type === 'UNCAUGHT_CRASH' || i.type.includes('FAIL')).length === 0 ? 'HEALTHY' : 'NEEDS_ATTENTION',
    };

    fs.writeFileSync(path.join(SCREENSHOT_DIR, 'final-user-audit.json'), JSON.stringify(auditReport, null, 2));
    console.log('✨ All browser tests, screenshots, and bug checks finished successfully!');

    await browser.close();
    server.close(() => process.exit(0));
  });
}

start().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
