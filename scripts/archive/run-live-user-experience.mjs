import http from 'http';
import next from 'next';
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const SCREENSHOT_DIR = '/home/zk3/.gemini/antigravity-cli/brain/0f823cc0-f689-4423-89be-6afe0099d995/screenshots';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function startInteractiveUserSession() {
  console.log('🚀 1. Initializing ContinuaOS server for live user experience...');
  const app = next({ dev: true, hostname: '127.0.0.1', port: 3000 });
  const handle = app.getRequestHandler();
  await app.prepare();

  const server = http.createServer(async (req, res) => {
    try {
      await handle(req, res);
    } catch (err) {
      res.statusCode = 500;
      res.end('Server Error');
    }
  });

  await new Promise((resolve) => server.listen(3000, '127.0.0.1', resolve));
  console.log('✅ ContinuaOS server live on http://127.0.0.1:3000');

  console.log('⏳ Pre-warming /os endpoint...');
  const res = await fetch('http://127.0.0.1:3000/os');
  console.log(`✨ Endpoint loaded with status ${res.status}!`);

  console.log('🚀 2. Launching Playwright Chromium as an active human user...');
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
  const userExperienceLog = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('  ⚠️  [Browser Console Error]', msg.text());
      userExperienceLog.push({ type: 'CONSOLE_ERROR', message: msg.text() });
    }
  });

  page.on('pageerror', (err) => {
    console.log('  🚨 [Uncaught Exception]', err.message);
    userExperienceLog.push({ type: 'UNCAUGHT_EXCEPTION', message: err.message });
  });

  console.log('📍 3. Navigating to Desktop (http://127.0.0.1:3000/os)...');
  await page.goto('http://127.0.0.1:3000/os', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  // Skip boot splash or unlock
  console.log('🖱️ Step 1: Dismissing splash screen / logging in...');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);
  await page.mouse.click(960, 540);
  await page.waitForTimeout(2000);

  try {
    const unlockBtn = page.locator('button:has-text("Enter"), button:has-text("Unlock"), button:has-text("Guest"), button:has-text("Login")').first();
    if (await unlockBtn.isVisible({ timeout: 2000 })) {
      console.log('🔑 Clicking session unlock...');
      await unlockBtn.click();
      await page.waitForTimeout(2000);
    }
  } catch {}

  console.log('📸 Capturing Clean Desktop Home...');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'persona-01-desktop-home.png') });

  // =========================================================================
  // 🎨 USER JOURNEY 1: The Designer & Writer
  // =========================================================================
  console.log('🎨 --- 4. Testing as a Designer & Writer ---');
  
  // 1. Open Figma & Test 4th Circle Hub
  console.log('  -> Opening Figma standalone app...');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'figma' } })));
  await page.waitForTimeout(3500);

  const fourthCircle = page.locator('button[aria-label*="App actions and stream controls"]').first();
  if (await fourthCircle.isVisible({ timeout: 2000 })) {
    console.log('  -> Hovering 4th purple circle stream hub...');
    await fourthCircle.hover();
    await page.waitForTimeout(1500);
  }
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'persona-02-designer-figma-hub.png') });

  // 2. Open CampaignLab
  console.log('  -> Opening CampaignLab project planner...');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'campaign-lab' } })));
  await page.waitForTimeout(4000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'persona-03-designer-campaignlab.png') });

  // 3. Open Moodboard Canvas
  console.log('  -> Opening Moodboard Studio creative canvas...');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'moodboard' } })));
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'persona-04-designer-moodboard.png') });

  // =========================================================================
  // 💻 USER JOURNEY 2: The Developer
  // =========================================================================
  console.log('💻 --- 5. Testing as a Developer ---');

  // 1. Open Code Studio IDE
  console.log('  -> Opening Code Studio IDE...');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'code' } })));
  await page.waitForTimeout(4000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'persona-05-developer-code-editor.png') });

  // 2. Open Terminal & Type Commands
  console.log('  -> Opening WASM Terminal & typing commands...');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'terminal' } })));
  await page.waitForTimeout(3000);
  await page.keyboard.type('help', { delay: 40 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'persona-06-developer-terminal.png') });

  // =========================================================================
  // 🧭 USER JOURNEY 3: The Explorer
  // =========================================================================
  console.log('🧭 --- 6. Testing as an Explorer ---');

  // 1. Apple / Continua Menubar Dropdown
  console.log('  -> Clicking Top Menubar Continua icon...');
  const logoBtn = page.locator('header button, [data-testid="os-menu-trigger"]').first();
  if (await logoBtn.isVisible({ timeout: 2000 })) {
    await logoBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'persona-07-explorer-apple-menu.png') });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // 2. Control Center
  console.log('  -> Clicking Control Center menu...');
  const controlCenterBtn = page.locator('button[aria-label*="Control Center"], [data-testid="control-center-trigger"]').first();
  if (await controlCenterBtn.isVisible({ timeout: 2000 })) {
    await controlCenterBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'persona-08-explorer-control-center.png') });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // 3. Time Machine 3D Stack
  console.log('  -> Triggering Time Machine 3D Checkpoint Stack...');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-time-machine')));
  await page.waitForTimeout(3500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'persona-09-explorer-time-machine-3d.png') });

  // 4. AI Omnibar
  console.log('  -> Triggering Screen-Aware AI Omnibar (Ctrl+Space)...');
  await page.keyboard.press('Control+Space');
  await page.waitForTimeout(1000);
  await page.keyboard.type('Show open design files and terminal sessions', { delay: 30 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'persona-10-explorer-ai-omnibar.png') });
  await page.keyboard.press('Escape');

  // Save audit
  const auditReport = {
    timestamp: new Date().toISOString(),
    totalScreenshots: 10,
    userExperienceLog,
    status: userExperienceLog.filter(e => e.type === 'UNCAUGHT_EXCEPTION').length === 0 ? 'STABLE' : 'ISSUES_DETECTED',
  };

  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'live-user-audit.json'), JSON.stringify(auditReport, null, 2));
  console.log('✨ Live User Experience Audit completed successfully!');

  await browser.close();
  server.close(() => process.exit(0));
}

startInteractiveUserSession().catch((err) => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
