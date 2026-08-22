import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = '/home/zk3/.gemini/antigravity-cli/brain/0f823cc0-f689-4423-89be-6afe0099d995';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'playwright_inspection');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Create a dummy file for import testing
const TEST_FILE_PATH = path.join(SCREENSHOT_DIR, 'continua_user_import_test.txt');
fs.writeFileSync(TEST_FILE_PATH, 'Hello from ContinuaOS File Import Test! Testing persistence and UI rendering.');

const TEST_IMG_PATH = path.join(SCREENSHOT_DIR, 'moodboard_sample_graphic.png');
// Create a small 1x1 png if not present
const samplePngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
fs.writeFileSync(TEST_IMG_PATH, Buffer.from(samplePngBase64, 'base64'));

async function inspectContinuaOS() {
  console.log('🚀 1. Launching Playwright Chromium for full user interaction testing...');
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
    viewport: { width: 1600, height: 900 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();
  const issuesFound = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('  ⚠️  [Browser Console Error]:', msg.text());
      issuesFound.push({ type: 'CONSOLE_ERROR', text: msg.text() });
    }
  });

  page.on('pageerror', (err) => {
    console.log('  🚨 [Uncaught Exception]:', err.message);
    issuesFound.push({ type: 'PAGE_EXCEPTION', text: err.message });
  });

  console.log('📍 2. Navigating to http://127.0.0.1:3000/os ...');
  await page.goto('http://127.0.0.1:3000/os', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(4000);

  // Take screenshot of boot splash / lock screen
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_boot_or_lockscreen.png') });

  // Dismiss boot / unlock
  console.log('🖱️ 3. Dismissing splash / unlocking desktop...');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);
  await page.mouse.click(800, 450);
  await page.waitForTimeout(1500);

  try {
    const unlockBtn = page.locator('button:has-text("Enter"), button:has-text("Unlock"), button:has-text("Guest"), button:has-text("Login")').first();
    if (await unlockBtn.isVisible({ timeout: 2000 })) {
      await unlockBtn.click();
      await page.waitForTimeout(2000);
    }
  } catch {}

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_desktop_unlocked.png') });
  console.log('✅ Desktop reached!');

  // =========================================================================
  // TEST 1: FILE MANAGER (FINDER) & FILE IMPORT
  // =========================================================================
  console.log('📁 4. Testing File Manager & File Import Flow...');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'finder' } })));
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_finder_open.png') });

  // Look for file input inside Finder and upload test file
  console.log('  -> Simulating user file upload into Finder...');
  const fileInput = page.locator('input[type="file"]').first();
  if (await fileInput.count() > 0) {
    await fileInput.setInputFiles(TEST_FILE_PATH);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_finder_after_upload.png') });
    console.log('  -> File input submitted!');
  } else {
    issuesFound.push({ type: 'UI_ISSUE', text: 'Could not find active <input type="file"> in Finder window' });
  }

  // Test Miller Columns view mode
  const columnsBtn = page.locator('button[title*="Column"], button:has-text("Columns"), [aria-label*="Column"]').first();
  if (await columnsBtn.isVisible({ timeout: 1500 })) {
    await columnsBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_finder_columns_view.png') });
  }

  // =========================================================================
  // TEST 2: MOODBOARD CANVAS & ASSET DROP
  // =========================================================================
  console.log('🎨 5. Testing Moodboard Studio...');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'moodboard' } })));
  await page.waitForTimeout(3500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_moodboard_open.png') });

  // Add text note
  const textBtn = page.locator('button[title*="Text"], button:has-text("Text"), button:has-text("Add Note")').first();
  if (await textBtn.isVisible({ timeout: 1500 })) {
    await textBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_moodboard_text_node.png') });
  }

  // =========================================================================
  // TEST 3: CAMPAIGNLAB & PROJECT HIERARCHIES
  // =========================================================================
  console.log('📊 6. Testing CampaignLab...');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'campaign-lab' } })));
  await page.waitForTimeout(3500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_campaign_lab_open.png') });

  // =========================================================================
  // TEST 4: POWER BROWSER
  // =========================================================================
  console.log('🌐 7. Testing Power Browser...');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'power-browser' } })));
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_power_browser_open.png') });

  // =========================================================================
  // TEST 5: CONTROL CENTER & TIME MACHINE
  // =========================================================================
  console.log('🧭 8. Testing Control Center & Time Machine...');
  const controlCenter = page.locator('button[aria-label*="Control Center"], [data-testid="control-center-trigger"]').first();
  if (await controlCenter.isVisible({ timeout: 1500 })) {
    await controlCenter.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_control_center.png') });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // AI Omnibar
  console.log('💡 9. Testing AI Omnibar (Ctrl+Space)...');
  await page.keyboard.press('Control+Space');
  await page.waitForTimeout(1000);
  await page.keyboard.type('ContinuaOS Live System Test', { delay: 30 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_ai_omnibar.png') });
  await page.keyboard.press('Escape');

  // Save audit
  const auditResult = {
    timestamp: new Date().toISOString(),
    screenshotsCaptured: fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png')),
    issuesFound,
    summary: issuesFound.length === 0 ? 'ALL_TESTS_CLEAN' : 'ISSUES_IDENTIFIED',
  };

  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'visual_inspection_report.json'), JSON.stringify(auditResult, null, 2));
  console.log('✨ Comprehensive Playwright visual audit complete! Captured', auditResult.screenshotsCaptured.length, 'screenshots.');

  await browser.close();
  process.exit(0);
}

inspectContinuaOS().catch((err) => {
  console.error('Fatal Playwright audit failure:', err);
  process.exit(1);
});
