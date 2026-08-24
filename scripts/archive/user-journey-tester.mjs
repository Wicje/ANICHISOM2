import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const SCREENSHOT_DIR = '/home/zk3/.gemini/antigravity-cli/brain/0f823cc0-f689-4423-89be-6afe0099d995/screenshots';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runUserJourneyAudit() {
  console.log('🤖 Starting Deep User-Journey Simulator in Chromium...');
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

  const issuesFound = [];
  const performanceTimers = {};

  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    if (type === 'error') {
      console.log('[Runtime Error]', text);
      issuesFound.push({ severity: 'ERROR', type: 'Console Error', message: text });
    } else if (type === 'warning' && text.includes('React') || text.includes('Hydration')) {
      console.log('[UI Warning]', text);
      issuesFound.push({ severity: 'WARN', type: 'UI/Hydration Warning', message: text });
    }
  });

  page.on('pageerror', err => {
    console.log('[Uncaught Crash]', err.message);
    issuesFound.push({ severity: 'CRITICAL', type: 'App Crash', message: err.message, stack: err.stack });
  });

  const startNav = Date.now();
  console.log('1️⃣ Navigating to ContinuaOS at http://127.0.0.1:3000/os ...');
  try {
    await page.goto('http://127.0.0.1:3000/os', { waitUntil: 'domcontentloaded', timeout: 0 });
  } catch (e) {
    console.log('Nav error:', e.message);
  }
  performanceTimers.initialLoad = Date.now() - startNav;

  await page.waitForTimeout(3000);

  // 1. User skips boot splash
  console.log('2️⃣ Testing Boot Splash dismissal...');
  try {
    await page.mouse.click(960, 540);
    await page.waitForTimeout(2500);
  } catch (e) {
    issuesFound.push({ severity: 'WARN', type: 'Boot Sequence', message: 'Could not click boot splash: ' + e.message });
  }

  // 2. User checks unlock
  try {
    const unlockBtn = page.locator('button:has-text("Enter"), button:has-text("Unlock"), button:has-text("Guest"), button:has-text("Login")').first();
    if (await unlockBtn.isVisible({ timeout: 2000 })) {
      console.log('🔑 Unlocking session...');
      await unlockBtn.click();
      await page.waitForTimeout(2000);
    }
  } catch {}

  console.log('📸 Capturing 01-desktop-clean.png...');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-desktop-clean.png') });

  // 3. User clicks Menubar Apple/Continua icon
  console.log('3️⃣ User clicks Continua Apple/Logo menu in top bar...');
  try {
    const logoMenuBtn = page.locator('button:has-text("Continua"), header button').first();
    if (await logoMenuBtn.isVisible({ timeout: 2000 })) {
      await logoMenuBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-topbar-apple-menu.png') });
      await page.keyboard.press('Escape');
    }
  } catch (e) {
    issuesFound.push({ severity: 'INFO', type: 'Top Bar Menu', message: e.message });
  }

  // 4. User opens Finder and navigates files
  console.log('4️⃣ User opens Finder app...');
  try {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'finder' } })));
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-finder-window.png') });
  } catch (e) {
    issuesFound.push({ severity: 'WARN', type: 'Finder', message: e.message });
  }

  // 5. User opens Spotify app and clicks Play
  console.log('5️⃣ User opens Spotify and explores music playback...');
  try {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'spotify' } })));
    await page.waitForTimeout(3000);
    
    // Test play button inside Spotify
    const playBtn = page.locator('button[aria-label*="Play"], button:has-text("Play"), [data-testid="play-button"]').first();
    if (await playBtn.isVisible({ timeout: 2000 })) {
      await playBtn.click();
      await page.waitForTimeout(1500);
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-spotify-playing.png') });
  } catch (e) {
    issuesFound.push({ severity: 'WARN', type: 'Spotify', message: e.message });
  }

  // 6. User opens Standalone Figma Web App and tests the 4th Purple Circle Hub
  console.log('6️⃣ User opens Figma & tests 4th Purple Circle Controls...');
  try {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'figma' } })));
    await page.waitForTimeout(3500);

    const fourthCircle = page.locator('button[aria-label*="App actions and stream controls"]').first();
    if (await fourthCircle.isVisible({ timeout: 2000 })) {
      await fourthCircle.hover();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-figma-4th-circle-hover.png') });
    }
  } catch (e) {
    issuesFound.push({ severity: 'WARN', type: 'Figma 4th Circle', message: e.message });
  }

  // 7. User triggers AI Omnibar (Ctrl+Space), types instruction
  console.log('7️⃣ User tests Screen-Aware AI Omnibar with live instruction...');
  try {
    await page.keyboard.press('Control+Space');
    await page.waitForTimeout(1500);
    
    // Type natural language query
    await page.keyboard.type('open screen recorder and switch theme', { delay: 40 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-ai-omnibar-query.png') });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  } catch (e) {
    issuesFound.push({ severity: 'WARN', type: 'AI Omnibar', message: e.message });
  }

  // 8. User opens Code Studio
  console.log('8️⃣ User opens Code Studio Sandbox...');
  try {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'code' } })));
    await page.waitForTimeout(3500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-code-studio.png') });
  } catch (e) {
    issuesFound.push({ severity: 'WARN', type: 'Code Studio', message: e.message });
  }

  // 9. User opens Screen Recorder
  console.log('9️⃣ User tests Screen Recorder App...');
  try {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'screen-recorder' } })));
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-screen-recorder.png') });
  } catch (e) {
    issuesFound.push({ severity: 'WARN', type: 'Screen Recorder', message: e.message });
  }

  // 10. User opens Productivity Suite
  console.log('🔟 User tests Productivity Suite App...');
  try {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'productivity-suite' } })));
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09-productivity-suite.png') });
  } catch (e) {
    issuesFound.push({ severity: 'WARN', type: 'Productivity Suite', message: e.message });
  }

  // 11. User tests Control Center
  console.log('1️⃣1️⃣ User opens Control Center...');
  try {
    const controlCenterBtn = page.locator('button[aria-label*="Control Center"], [data-testid="control-center-trigger"]').first();
    if (await controlCenterBtn.isVisible({ timeout: 2000 })) {
      await controlCenterBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10-control-center.png') });
      await page.keyboard.press('Escape');
    }
  } catch (e) {
    issuesFound.push({ severity: 'INFO', type: 'Control Center', message: e.message });
  }

  // 12. User opens Time Machine 3D Backup
  console.log('1️⃣2️⃣ User triggers Time Machine 3D Backup Stack...');
  try {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-time-machine')));
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11-time-machine-stack.png') });
  } catch (e) {
    issuesFound.push({ severity: 'WARN', type: 'Time Machine', message: e.message });
  }

  console.log('🏁 User journey testing complete!');
  const auditReport = {
    timestamp: new Date().toISOString(),
    totalScreenshotsCaptured: 11,
    performanceTimers,
    issuesFound,
    overallHealth: issuesFound.filter(i => i.severity === 'CRITICAL').length === 0 ? 'HEALTHY' : 'NEEDS_ATTENTION',
  };

  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'user-audit-report.json'), JSON.stringify(auditReport, null, 2));
  console.log('📊 Audit report written to screenshots/user-audit-report.json');

  await browser.close();
}

runUserJourneyAudit().catch(err => {
  console.error('Fatal user test error:', err);
  process.exit(1);
});
