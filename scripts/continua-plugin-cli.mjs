#!/usr/bin/env node

/**
 * Continua Plugin CLI Generator
 *
 * Usage:
 *   node scripts/continua-plugin-cli.mjs init <plugin-name> [--category=<category>]
 */

import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const command = args[0];
const pluginName = args[1];

if (command !== 'init' || !pluginName) {
  console.log(`
🚀 Continua Plugin Developer CLI (Layer 3)

Usage:
  node scripts/continua-plugin-cli.mjs init <plugin-name> [options]

Options:
  --category=<productivity|creative|developer|utility|media> (default: utility)
  --author=<author-name> (default: Continua Developer)
  `);
  process.exit(1);
}

const id = pluginName.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
const categoryArg = args.find((a) => a.startsWith('--category='));
const category = categoryArg ? categoryArg.split('=')[1] : 'utility';
const authorArg = args.find((a) => a.startsWith('--author='));
const author = authorArg ? authorArg.split('=')[1] : 'Continua Developer';

const outDir = path.join(process.cwd(), 'plugins', id);

if (fs.existsSync(outDir)) {
  console.error(`❌ Error: Directory plugins/${id} already exists.`);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

// 1. Manifest
const manifest = {
  id,
  name: pluginName,
  version: '1.0.0',
  description: `A Continua workspace plugin for ${pluginName}`,
  author,
  category,
  permissions: ['storage:read', 'storage:write', 'ui:notifications'],
  runtime: 'iframe',
  entryUrl: 'index.html',
};

fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

// 2. HTML entry template
const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${pluginName}</title>
  <style>
    body {
      margin: 0;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #060608;
      color: #f3f4f6;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      box-sizing: border-box;
    }
    .card {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 32px;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    }
    h1 {
      margin: 0 0 8px;
      font-size: 20px;
      font-weight: 700;
      color: #10F4A0;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    p {
      color: rgba(255, 255, 255, 0.6);
      font-size: 13px;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    button {
      background: #10F4A0;
      color: #060608;
      border: none;
      border-radius: 10px;
      padding: 10px 20px;
      font-weight: bold;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
    }
    button:hover {
      background: #0BC68A;
      transform: scale(1.02);
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>${pluginName}</h1>
    <p>Persistent context layer integration ready.</p>
    <button id="notifyBtn">Send System Toast</button>
  </div>

  <script type="module">
    import { initContinuaSDK } from '/lib/plugin-sdk/index.js';

    const sdk = initContinuaSDK('${id}');

    document.getElementById('notifyBtn').addEventListener('click', async () => {
      await sdk.ui.notify('${pluginName}', 'Hello from your Continua plugin!');
    });
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(outDir, 'index.html'), html);

// 3. README.md
const readme = `# ${pluginName} (Continua Plugin)

This is a template plugin created with the **Continua Plugin CLI**.

## Structure
- \`manifest.json\`: Manifest configuration with declared permissions.
- \`index.html\`: Sandboxed entry point.

## Permissions Declared
\`\`\`json
${JSON.stringify(manifest.permissions, null, 2)}
\`\`\`

## Testing in ContinuaOS
1. Host locally or upload to your web server.
2. Open the Continua App Store / Admin Panel.
3. Submit your manifest URL to register and install.
`;

fs.writeFileSync(path.join(outDir, 'README.md'), readme);

console.log(`
✅ Successfully created plugin template at plugins/${id}!
📄 Manifest: plugins/${id}/manifest.json
🌐 Entry Point: plugins/${id}/index.html
📖 README: plugins/${id}/README.md
`);
