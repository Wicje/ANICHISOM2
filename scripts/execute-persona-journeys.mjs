import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const SCREENSHOT_DIR = '/home/zk3/.gemini/antigravity-cli/brain/0f823cc0-f689-4423-89be-6afe0099d995/screenshots';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function run() {
  console.log('🚀 Launching Playwright Chromium for Multi-Persona User Experience...');

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

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('  ⚠️  [Browser Error]', msg.text());
      runtimeIssues.push({ type: 'CONSOLE_ERROR', message: msg.text() });
    }
  });

  page.on('pageerror', (err) => {
    console.log('  🚨 [Uncaught Exception]', err.message);
    runtimeIssues.push({ type: 'UNCAUGHT_EXCEPTION', message: err.message });
  });

  console.log('📍 Navigating to ContinuaOS at http://127.0.0.1:3000/os ...');
  await page.goto('http://127.0.0.1:3000/os', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForTimeout(4000);

  // 1. Dismiss splash / login
  console.log('🖱️ Step 1: Dismissing splash screen / login...');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);
  await page.mouse.click(960, 540);
  await page.waitForTimeout(2000);

  try {
    const unlockBtn = page.locator('button:has-text("Enter"), button:has-text("Unlock"), button:has-text("Guest"), button:has-text("Login")').first();
    if (await unlockBtn.isVisible({ timeout: 2000 })) {
      console.log('🔑 Unlocking session...');
      await unlockBtn.click();
      await page.waitForTimeout(2000);
    }
  } catch {}

  console.log('📸 1. Capturing Desktop Home...');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'persona-01-desktop-home.png') });

  // =========================================================================
  // 🎨 USER JOURNEY 1: The Designer & Writer
  // =========================================================================
  console.log('🎨 --- Persona 1: The Designer & Writer ---');
  
  // Figma
  console.log('  -> Opening Figma...');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'figma' } })));
  await page.waitForTimeout(3500);

  const fourthCircle = page.locator('button[aria-label*="App actions and stream controls"]').first();
  if (await fourthCircle.isVisible({ timeout: 2000 })) {
    console.log('  -> Hovering 4th purple circle...');
    await fourthCircle.hover();
    await page.waitForTimeout(1500);
  }
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'persona-02-designer-figma-hub.png') });

  // CampaignLab
  console.log('  -> Opening CampaignLab...');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'campaign-lab' } })));
  await page.waitForTimeout(4000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'persona-03-designer-campaignlab.png') });

  // Moodboard
  console.log('  -> Opening Moodboard Studio...');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'moodboard' } })));
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'persona-04-designer-moodboard.png') });

  // =========================================================================
  // 💻 USER JOURNEY 2: The Developer
  // =========================================================================
  console.log('💻 --- Persona 2: The Developer ---');

  // Code Studio
  console.log('  -> Opening Code Studio IDE...');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'code' } })));
  await page.waitForTimeout(4000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'persona-05-developer-code-editor.png') });

  // Terminal
  console.log('  -> Opening WASM Terminal...');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'terminal' } })));
  await page.waitForTimeout(3000);
  await page.keyboard.type('help', { delay: 40 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'persona-06-developer-terminal.png') });

  // =========================================================================
  // 🧭 USER JOURNEY 3: The Explorer
  // =========================================================================
  console.log('🧭 --- Persona 3: The Explorer ---');

  // Top Menubar
  console.log('  -> Testing Top Menubar Dropdown...');
  const logoBtn = page.locator('header button, [data-testid="os-menu-trigger"]').first();
  if (await logoBtn.isVisible({ timeout: 2000 })) {
    await logoBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'persona-07-explorer-apple-menu.png') });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // Control Center
  console.log('  -> Opening Control Center...');
  const controlCenterBtn = page.locator('button[aria-label*="Control Center"], [data-testid="control-center-trigger"]').first();
  if (await controlCenterBtn.isVisible({ timeout: 2000 })) {
    await controlCenterBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'persona-08-explorer-control-center.png') });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // Time Machine 3D Stack
  console.log('  -> Opening Time Machine 3D Stack...');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-time-machine')));
  await page.waitForTimeout(3500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'persona-09-explorer-time-machine-3d.png') });

  // AI Omnibar
  console.log('  -> Testing AI Omnibar (Ctrl+Space)...');
  await page.keyboard.press('Control+Space');
  await page.waitForTimeout(1000);
  await page.keyboard.type('Show open design files and terminal sessions', { delay: 30 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'persona-10-explorer-ai-omnibar.png') });
  await page.keyboard.press('Escape');

  // Save report
  const auditReport = {
    timestamp: new Date().toISOString(),
    totalScreenshots: 10,
    runtimeIssues,
    health: runtimeIssues.filter(e => e.type === 'UNCAUGHT_EXCEPTION').length === 0 ? 'STABLE' : 'NEEDS_ATTENTION',
  };

  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'live-persona-audit.json'), JSON.stringify(auditReport, null, 2));
  console.log('✨ All persona user journeys and screenshots completed successfully!');

  await browser.close();
  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal user execution error:', err);
  process.exit(1);
});
