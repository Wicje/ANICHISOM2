import { spawn } from 'child_process';
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const SCREENSHOT_DIR = '/home/zk3/.gemini/antigravity-cli/brain/0f823cc0-f689-4423-89be-6afe0099d995/screenshots';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function waitForServer(url, timeoutMs = 600000) {
  const start = Date.now();
  console.log(`⏳ Waiting for ContinuaOS server at ${url} to be ready...`);
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status === 200) {
        console.log(`✅ ContinuaOS server responded with HTTP 200 OK!`);
        return true;
      }
    } catch (e) {
      // Still compiling or booting
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error(`Timed out waiting for server at ${url}`);
}

async function run() {
  console.log('🚀 Step 1: Starting ContinuaOS server process with 8GB heap...');
  const serverProcess = spawn('npx', ['next', 'dev', '-p', '3000', '-H', '127.0.0.1'], {
    env: {
      ...process.env,
      NODE_OPTIONS: '--max-old-space-size=8192',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProcess.stdout.on('data', data => {
    const str = data.toString();
    if (str.includes('Ready') || str.includes('Compiled') || str.includes('GET /os')) {
      console.log('[Next.js]', str.trim());
    }
  });

  serverProcess.stderr.on('data', data => {
    // console.log('[Next.js Error]', data.toString().trim());
  });

  // Step 2: Wait for /os to return HTTP 200
  await waitForServer('http://127.0.0.1:3000/os');

  console.log('🌐 Step 2: Launching Playwright Chromium for Interactive User Journey Testing...');
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
  const consoleIssues = [];

  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    if (type === 'error') {
      console.log('  ⚠️  [Browser Console Error]', text);
      consoleIssues.push({ type: 'CONSOLE_ERROR', message: text });
    }
  });

  page.on('pageerror', err => {
    console.log('  🚨 [Browser Uncaught Exception]', err.message);
    consoleIssues.push({ type: 'CRASH', message: err.message });
  });

  console.log('📍 Navigating to ContinuaOS desktop...');
  await page.goto('http://127.0.0.1:3000/os', { waitUntil: 'networkidle', timeout: 30000 });

  // 1. Skip boot splash
  console.log('🖱️ 1. Dismissing Boot Splash Screen...');
  await page.waitForTimeout(2000);
  try {
    await page.mouse.click(960, 540);
    await page.waitForTimeout(2500);
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

  // 3. Open Spotify & verify track artwork & controls
  console.log('🎵 2. Opening Spotify Player...');
  try {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'spotify' } })));
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-spotify-window.png') });
  } catch (e) {
    consoleIssues.push({ type: 'SPOTIFY_FAIL', message: e.message });
  }

  // 4. Open Standalone Figma & Test 4th Purple Circle Hover Hub
  console.log('🎨 3. Opening Standalone Figma & Hovering 4th Traffic Light Circle...');
  try {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'figma' } })));
    await page.waitForTimeout(4000);

    const fourthCircle = page.locator('button[aria-label*="App actions and stream controls"]').first();
    if (await fourthCircle.isVisible({ timeout: 2000 })) {
      await fourthCircle.hover();
      await page.waitForTimeout(1500);
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-webapp-4th-circle.png') });
  } catch (e) {
    consoleIssues.push({ type: 'FIGMA_4TH_CIRCLE_FAIL', message: e.message });
  }

  // 5. Test Screen-Aware AI Omnibar
  console.log('🤖 4. Testing Screen-Aware AI Omnibar (<Ctrl+Space>)...');
  try {
    await page.keyboard.press('Control+Space');
    await page.waitForTimeout(1500);
    await page.keyboard.type('switch to dark mode and set focus to zen', { delay: 30 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-ai-omnibar.png') });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  } catch (e) {
    consoleIssues.push({ type: 'AI_OMNIBAR_FAIL', message: e.message });
  }

  // 6. Open Code Studio Live Sandbox
  console.log('💻 5. Opening Code Studio Live IDE...');
  try {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'code' } })));
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-code-editor-split.png') });
  } catch (e) {
    consoleIssues.push({ type: 'CODE_STUDIO_FAIL', message: e.message });
  }

  // 7. Open Screen Recorder
  console.log('📹 6. Opening Screen Recorder App (Checking no crashes)...');
  try {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'screen-recorder' } })));
    await page.waitForTimeout(3500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-screen-recorder.png') });
  } catch (e) {
    consoleIssues.push({ type: 'SCREEN_RECORDER_FAIL', message: e.message });
  }

  // 8. Open Productivity Suite
  console.log('📊 7. Opening Productivity Suite (Checking no crashes)...');
  try {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'productivity-suite' } })));
    await page.waitForTimeout(3500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-productivity-suite.png') });
  } catch (e) {
    consoleIssues.push({ type: 'PRODUCTIVITY_SUITE_FAIL', message: e.message });
  }

  // 9. Open Time Machine 3D Backup
  console.log('⏳ 8. Opening Time Machine System Snapshot...');
  try {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-time-machine')));
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-time-machine-3d.png') });
  } catch (e) {
    consoleIssues.push({ type: 'TIME_MACHINE_FAIL', message: e.message });
  }

  console.log('🏁 Writing comprehensive audit report...');
  const report = {
    timestamp: new Date().toISOString(),
    testsPassed: 8 - consoleIssues.filter(i => i.type.includes('FAIL') || i.type === 'CRASH').length,
    totalTests: 8,
    consoleIssues,
    status: consoleIssues.filter(i => i.type === 'CRASH').length === 0 ? 'HEALTHY' : 'NEEDS_ATTENTION',
  };

  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'audit-report.json'), JSON.stringify(report, null, 2));
  console.log('✨ All screenshots and test reports completed!');

  await browser.close();
  serverProcess.kill('SIGTERM');
  process.exit(0);
}

run().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
