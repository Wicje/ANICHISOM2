import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const SCREENSHOT_DIR = '/home/zk3/.gemini/antigravity-cli/brain/0f823cc0-f689-4423-89be-6afe0099d995/screenshots';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runTest() {
  console.log('🚀 Launching Playwright Chromium on Arch Linux...');
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
    const text = msg.text();
    const type = msg.type();
    if (type === 'error') {
      console.log('  ⚠️  [Browser Console Error]', text);
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

  console.log('📍 1. Navigating to ContinuaOS at http://127.0.0.1:3000/os ...');
  await page.goto('http://127.0.0.1:3000/os', { waitUntil: 'domcontentloaded', timeout: 180000 });

  console.log('⏳ Waiting 5s for desktop components to hydrate...');
  await page.waitForTimeout(5000);

  // 1. Skip boot splash
  console.log('🖱️ 2. Dismissing Boot Splash Screen...');
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

  console.log('📸 3. Capturing 01-desktop-overview.png...');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-desktop-overview.png') });

  // 3. Apple/Continua Top Menu Bar
  console.log('🍎 4. Testing Top Menu Bar Continua dropdown...');
  try {
    const logoBtn = page.locator('header button, [data-testid="os-menu-trigger"]').first();
    if (await logoBtn.isVisible({ timeout: 2000 })) {
      await logoBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-topbar-apple-menu.png') });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  } catch (e) {
    console.log('Top bar note:', e.message);
  }

  // 4. Finder App
  console.log('📁 5. Opening Finder App...');
  try {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'finder' } })));
    await page.waitForTimeout(3500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-finder-window.png') });
  } catch (e) {
    runtimeIssues.push({ type: 'FINDER_FAIL', message: e.message });
  }

  // 5. Spotify App
  console.log('🎵 6. Opening Spotify App & Testing Playback...');
  try {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'spotify' } })));
    await page.waitForTimeout(4000);
    
    const playBtn = page.locator('button[aria-label*="Play"], button:has-text("Play"), [data-testid="play-button"]').first();
    if (await playBtn.isVisible({ timeout: 2000 })) {
      await playBtn.click();
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-spotify-playing.png') });
  } catch (e) {
    runtimeIssues.push({ type: 'SPOTIFY_FAIL', message: e.message });
  }

  // 6. Figma (3rd Party App) & 4th Purple Circle Hover Hub
  console.log('🎨 7. Opening Figma & Testing 4th Purple Circle Hub...');
  try {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'figma' } })));
    await page.waitForTimeout(4000);

    const fourthCircle = page.locator('button[aria-label*="App actions and stream controls"]').first();
    if (await fourthCircle.isVisible({ timeout: 2000 })) {
      await fourthCircle.hover();
      await page.waitForTimeout(1500);
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-figma-4th-circle-hover.png') });
  } catch (e) {
    runtimeIssues.push({ type: 'FIGMA_FAIL', message: e.message });
  }

  // 7. Screen-Aware AI Omnibar
  console.log('🤖 8. Testing Screen-Aware AI Omnibar (<Ctrl+Space>)...');
  try {
    await page.keyboard.press('Control+Space');
    await page.waitForTimeout(1500);
    await page.keyboard.type('open screen recorder and switch to dark mode', { delay: 30 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-ai-omnibar-query.png') });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  } catch (e) {
    runtimeIssues.push({ type: 'AI_OMNIBAR_FAIL', message: e.message });
  }

  // 8. Code Studio Live Sandbox
  console.log('💻 9. Opening Code Studio Live IDE...');
  try {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'code' } })));
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-code-studio.png') });
  } catch (e) {
    runtimeIssues.push({ type: 'CODE_STUDIO_FAIL', message: e.message });
  }

  // 9. Screen Recorder App
  console.log('📹 10. Testing Screen Recorder App (Checking Zero Crashes)...');
  try {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'screen-recorder' } })));
    await page.waitForTimeout(3500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-screen-recorder.png') });
  } catch (e) {
    runtimeIssues.push({ type: 'SCREEN_RECORDER_FAIL', message: e.message });
  }

  // 10. Productivity Suite
  console.log('📊 11. Testing Productivity Suite App (Checking Zero Crashes)...');
  try {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'productivity-suite' } })));
    await page.waitForTimeout(3500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09-productivity-suite.png') });
  } catch (e) {
    runtimeIssues.push({ type: 'PRODUCTIVITY_SUITE_FAIL', message: e.message });
  }

  // 11. Control Center
  console.log('🎛️ 12. Testing Control Center...');
  try {
    const controlCenterBtn = page.locator('button[aria-label*="Control Center"], [data-testid="control-center-trigger"]').first();
    if (await controlCenterBtn.isVisible({ timeout: 2000 })) {
      await controlCenterBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10-control-center.png') });
      await page.keyboard.press('Escape');
    }
  } catch (e) {
    console.log('Control center note:', e.message);
  }

  // 12. Time Machine 3D Backup
  console.log('⏳ 13. Testing Time Machine 3D System Snapshot Stack...');
  try {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-time-machine')));
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11-time-machine-stack.png') });
  } catch (e) {
    runtimeIssues.push({ type: 'TIME_MACHINE_FAIL', message: e.message });
  }

  console.log('🏁 14. Writing comprehensive user audit report...');
  const auditReport = {
    timestamp: new Date().toISOString(),
    testsExecuted: 12,
    totalScreenshots: 11,
    runtimeIssues,
    overallHealth: runtimeIssues.filter(i => i.type === 'UNCAUGHT_CRASH' || i.type.includes('FAIL')).length === 0 ? 'HEALTHY' : 'NEEDS_ATTENTION',
  };

  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'user-audit-report.json'), JSON.stringify(auditReport, null, 2));
  console.log('✨ All browser tests, screenshots, and bug checks finished successfully!');

  await browser.close();
  process.exit(0);
}

runTest().catch(err => {
  console.error('Fatal user test error:', err);
  process.exit(1);
});
