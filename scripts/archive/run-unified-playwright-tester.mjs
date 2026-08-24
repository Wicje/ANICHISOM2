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

const TEST_FILE_PATH = path.join(SCREENSHOT_DIR, 'continua_user_import_test.txt');
fs.writeFileSync(TEST_FILE_PATH, 'ContinuaOS Live File Upload Verification Test.');

async function run() {
  console.log('🚀 Step 1: Starting in-process Next.js Server...');
  const app = next({ dev: true, hostname: '127.0.0.1', port: 3000, turbo: true });
  const handle = app.getRequestHandler();
  await app.prepare();

  const server = http.createServer(async (req, res) => {
    try {
      await handle(req, res);
    } catch (err) {
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  await new Promise((resolve) => server.listen(3000, '127.0.0.1', resolve));
  console.log('✅ Server listening on http://127.0.0.1:3000');

  console.log('🚀 Step 2: Launching Playwright Chromium...');
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
  const issues = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('  ⚠️  [Browser Console Error]:', msg.text());
      issues.push({ type: 'CONSOLE_ERROR', text: msg.text() });
    }
  });

  page.on('pageerror', (err) => {
    console.log('  🚨 [Uncaught Page Error]:', err.message);
    issues.push({ type: 'PAGE_ERROR', text: err.message });
  });

  console.log('📍 Step 3: Navigating to ContinuaOS Desktop...');
  await page.goto('http://127.0.0.1:3000/os', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(4000);

  // Take screenshot 1
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_initial_load.png') });
  console.log('📸 Captured 01_initial_load.png');

  // Dismiss boot splash or unlock
  console.log('🖱️ Step 4: Dismissing splash / unlocking...');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);
  await page.mouse.click(720, 450);
  await page.waitForTimeout(2000);

  try {
    const unlockBtn = page.locator('button:has-text("Enter"), button:has-text("Unlock"), button:has-text("Guest"), button:has-text("Login")').first();
    if (await unlockBtn.isVisible({ timeout: 2000 })) {
      await unlockBtn.click();
      await page.waitForTimeout(2000);
    }
  } catch {}

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_desktop_active.png') });
  console.log('📸 Captured 02_desktop_active.png');

  // Open Finder
  console.log('📁 Step 5: Opening File Manager (Finder)...');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'finder' } })));
  await page.waitForTimeout(3500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_finder_window.png') });
  console.log('📸 Captured 03_finder_window.png');

  // Test File Upload
  console.log('📤 Step 6: Testing File Upload in Finder...');
  const fileInput = page.locator('input[type="file"]').first();
  if (await fileInput.count() > 0) {
    await fileInput.setInputFiles(TEST_FILE_PATH);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_finder_after_upload.png') });
    console.log('📸 Captured 04_finder_after_upload.png');
  }

  // Open Moodboard
  console.log('🎨 Step 7: Opening Moodboard Studio...');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'moodboard' } })));
  await page.waitForTimeout(3500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_moodboard_canvas.png') });
  console.log('📸 Captured 05_moodboard_canvas.png');

  // Open CampaignLab
  console.log('📊 Step 8: Opening CampaignLab...');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'campaign-lab' } })));
  await page.waitForTimeout(3500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_campaign_lab.png') });
  console.log('📸 Captured 06_campaign_lab.png');

  // Open AI Omnibar
  console.log('💡 Step 9: Testing AI Omnibar (Ctrl+Space)...');
  await page.keyboard.press('Control+Space');
  await page.waitForTimeout(1000);
  await page.keyboard.type('Test file import and canvas rendering', { delay: 30 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_ai_omnibar.png') });
  console.log('📸 Captured 07_ai_omnibar.png');
  await page.keyboard.press('Escape');

  // Save inspection summary
  const summary = {
    timestamp: new Date().toISOString(),
    screenshots: fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png')),
    issues,
  };
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log('🎉 Unified Playwright testing successfully completed!');

  await browser.close();
  server.close(() => process.exit(0));
}

run().catch((err) => {
  console.error('Unified runner failed:', err);
  process.exit(1);
});
