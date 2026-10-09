import { app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'apps', 'shell', 'public', 'images', 'screenshots');
fs.mkdirSync(OUT, { recursive: true });

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  await win.loadFile(path.join(ROOT, 'apps', 'desktop', 'dist', 'index.html'));
  await new Promise((r) => setTimeout(r, 2500));
  const user = await win.webContents.capturePage();
  fs.writeFileSync(path.join(OUT, 'browser-user.png'), user.toPNG());
  await win.webContents.executeJavaScript(
    'document.querySelector(\'.ui-mode-btn[title="Agent mode"]\').click()'
  );
  await new Promise((r) => setTimeout(r, 1200));
  const agent = await win.webContents.capturePage();
  fs.writeFileSync(path.join(OUT, 'browser-agent.png'), agent.toPNG());
  app.exit(0);
});
