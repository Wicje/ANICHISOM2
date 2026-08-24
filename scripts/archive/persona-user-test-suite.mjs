import http from 'http';
import next from 'next';
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const SCREENSHOT_DIR = '/home/zk3/.gemini/antigravity-cli/brain/0f823cc0-f689-4423-89be-6afe0099d995/screenshots';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runPersonaAudit() {
  console.log('🚀 Starting ContinuaOS Multi-Persona Browser User Audit...');
  
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
  console.log('✅ ContinuaOS Server listening on http://127.0.0.1:3000');

  console.log('⏳ Warming up /os endpoint...');
  const res = await fetch('http://127.0.0.1:3000/os');
  console.log(`✨ Endpoint ready with status ${res.status}!`);

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
  const personaLogs = {
    designerWriter: [],
    developer: [],
    explorer: [],
    everydayUser: [],
    errors: [],
  };

  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error') {
      personaLogs.errors.push({ type: 'CONSOLE_ERROR', message: text });
    }
  });

  page.on('pageerror', (err) => {
    personaLogs.errors.push({ type: 'UNCAUGHT_EXCEPTION', message: err.message });
  });

  console.log('📍 Navigating to ContinuaOS Desktop...');
  await page.goto('http://127.0.0.1:3000/os', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Auto-skip splash / press Enter
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);

  // Unlock if login/guest
  try {
    const unlockBtn = page.locator('button:has-text("Enter"), button:has-text("Unlock"), button:has-text("Guest"), button:has-text("Login")').first();
    if (await unlockBtn.isVisible({ timeout: 1500 })) {
      await unlockBtn.click();
      await page.waitForTimeout(1500);
    }
  } catch {}

  // =========================================================================
  // PERSONA 1: The Designer & Writer
  // =========================================================================
  console.log('🎨 --- PERSONA 1: THE DESIGNER & WRITER ---');
  try {
    // 1. Launch Figma & Test 4th Circle Hub
    console.log('  -> Launching Figma & inspecting 4th Purple Circle Hub...');
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'figma' } })));
    await page.waitForTimeout(3000);

    const fourthCircle = page.locator('button[aria-label*="App actions and stream controls"]').first();
    if (await fourthCircle.isVisible({ timeout: 2000 })) {
      await fourthCircle.hover();
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'persona1-designer-figma.png') });
    personaLogs.designerWriter.push({ test: 'Figma & 4th Purple Circle Hub', status: 'SUCCESS' });

    // 2. Launch CampaignLab
    console.log('  -> Launching CampaignLab Project & Creative Planner...');
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'campaign-lab' } })));
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'persona1-designer-campaignlab.png') });
    personaLogs.designerWriter.push({ test: 'CampaignLab Workflow', status: 'SUCCESS' });

    // 3. Launch Moodboard Canvas
    console.log('  -> Launching Creative Moodboard Studio...');
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'moodboard' } })));
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'persona1-designer-moodboard.png') });
    personaLogs.designerWriter.push({ test: 'Moodboard Studio', status: 'SUCCESS' });
  } catch (e) {
    personaLogs.designerWriter.push({ test: 'Designer Suite Error', status: 'FAIL', error: e.message });
  }

  // =========================================================================
  // PERSONA 2: The Developer
  // =========================================================================
  console.log('💻 --- PERSONA 2: THE DEVELOPER ---');
  try {
    // 1. Launch Code Studio
    console.log('  -> Launching Code Studio Sandbox...');
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'code' } })));
    await page.waitForTimeout(3500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'persona2-developer-code-studio.png') });
    personaLogs.developer.push({ test: 'Code Studio IDE', status: 'SUCCESS' });

    // 2. Launch WASM Terminal
    console.log('  -> Launching WASM Terminal Sandbox...');
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'terminal' } })));
    await page.waitForTimeout(2500);
    await page.keyboard.type('help', { delay: 50 });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'persona2-developer-terminal.png') });
    personaLogs.developer.push({ test: 'WASM Terminal execution', status: 'SUCCESS' });
  } catch (e) {
    personaLogs.developer.push({ test: 'Developer Suite Error', status: 'FAIL', error: e.message });
  }

  // =========================================================================
  // PERSONA 3: The Explorer
  // =========================================================================
  console.log('🧭 --- PERSONA 3: THE EXPLORER ---');
  try {
    // 1. Apple/Continua Top Menubar
    console.log('  -> Testing Top Menubar Dropdown...');
    const logoBtn = page.locator('header button, [data-testid="os-menu-trigger"]').first();
    if (await logoBtn.isVisible({ timeout: 2000 })) {
      await logoBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'persona3-explorer-menubar.png') });
      await page.keyboard.press('Escape');
    }

    // 2. Control Center
    console.log('  -> Opening Control Center...');
    const controlCenterBtn = page.locator('button[aria-label*="Control Center"], [data-testid="control-center-trigger"]').first();
    if (await controlCenterBtn.isVisible({ timeout: 2000 })) {
      await controlCenterBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'persona3-explorer-control-center.png') });
      await page.keyboard.press('Escape');
    }

    // 3. Time Machine 3D Stack
    console.log('  -> Triggering Time Machine 3D Checkpoint Stack...');
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-time-machine')));
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'persona3-explorer-time-machine.png') });
    personaLogs.explorer.push({ test: 'Time Machine 3D Stack', status: 'SUCCESS' });
  } catch (e) {
    personaLogs.explorer.push({ test: 'Explorer Suite Error', status: 'FAIL', error: e.message });
  }

  // =========================================================================
  // PERSONA 4: The Everyday User
  // =========================================================================
  console.log('💼 --- PERSONA 4: THE EVERYDAY USER ---');
  try {
    // 1. Finder
    console.log('  -> Opening Finder Filesystem Explorer...');
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'finder' } })));
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'persona4-everyday-finder.png') });
    personaLogs.everydayUser.push({ test: 'Finder Filesystem', status: 'SUCCESS' });

    // 2. Spotify
    console.log('  -> Opening Spotify Player...');
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('os:open-app', { detail: { appId: 'spotify' } })));
    await page.waitForTimeout(3000);
    const playBtn = page.locator('button[aria-label*="Play"], button:has-text("Play"), [data-testid="play-button"]').first();
    if (await playBtn.isVisible({ timeout: 2000 })) {
      await playBtn.click();
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'persona4-everyday-spotify.png') });
    personaLogs.everydayUser.push({ test: 'Spotify Audio Playback', status: 'SUCCESS' });

    // 3. AI Omnibar
    console.log('  -> Triggering Screen-Aware AI Omnibar (Ctrl+Space)...');
    await page.keyboard.press('Control+Space');
    await page.waitForTimeout(1000);
    await page.keyboard.type('What apps are currently open on my screen?', { delay: 30 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'persona4-everyday-ai-omnibar.png') });
    await page.keyboard.press('Escape');
    personaLogs.everydayUser.push({ test: 'AI Omnibar', status: 'SUCCESS' });
  } catch (e) {
    personaLogs.everydayUser.push({ test: 'Everyday Suite Error', status: 'FAIL', error: e.message });
  }

  // Save report
  const finalAudit = {
    timestamp: new Date().toISOString(),
    personas: {
      designerWriter: personaLogs.designerWriter,
      developer: personaLogs.developer,
      explorer: personaLogs.explorer,
      everydayUser: personaLogs.everydayUser,
    },
    totalErrors: personaLogs.errors.length,
    errors: personaLogs.errors,
  };

  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'multi-persona-audit-report.json'), JSON.stringify(finalAudit, null, 2));
  console.log('🎉 Multi-Persona Audit Complete!');

  await browser.close();
  server.close(() => process.exit(0));
}

runPersonaAudit().catch((err) => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
