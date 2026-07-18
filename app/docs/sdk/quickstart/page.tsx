import { CodeBlock } from '../../code-block';

export default function QuickstartPage() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold text-white mb-2">Quick Start</h1>
      <p className="text-white/50 text-lg mb-8">Build your first ContinuaOS plugin in 5 minutes.</p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Step 1: Create Your App Component</h2>
      <p className="text-white/70 text-sm mb-4">
        Create a new file for your plugin. This component will be rendered inside a ContinuaOS window.
      </p>
      <CodeBlock language="tsx" filename="my-plugin.tsx" code={`import { registerApp } from 'continuaos-sdk';
import type { AppManifest, AppProps } from 'continuaos-sdk';

// Define your app manifest
const manifest: AppManifest = {
  id: 'my-plugin',
  title: 'My Plugin',
  description: 'A simple note-taking plugin',
  version: '1.0.0',
  author: 'Your Name',
  category: 'productivity',
  icon: 'FileText',
  roles: ['user', 'admin'],
  size: { width: 600, height: 400 },
};

// Build your app component
function MyPlugin({ context, focused }: AppProps) {
  const user = context.getUser();

  return (
    <div className="h-full p-6 bg-[var(--os-surface)]">
      <h1 className="text-xl font-bold mb-4">
        Hello, {user?.name || 'Guest'}!
      </h1>
      <p className="text-[var(--os-text-muted)]">
        Welcome to my first ContinuaOS plugin.
      </p>
    </div>
  );
}

// Register the app
registerApp(manifest, MyPlugin);`} />

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Step 2: Register with the OS</h2>
      <p className="text-white/70 text-sm mb-4">
        The <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">registerApp()</code> call tells ContinuaOS about your plugin.
        The OS will load your component when the user opens the app.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Step 3: Add Features</h2>
      <p className="text-white/70 text-sm mb-4">
        Use the <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">context</code> prop to access OS services:
      </p>
      <CodeBlock language="tsx" code={`function MyPlugin({ context }: AppProps) {
  // Get current user
  const user = context.getUser();

  // Show a notification
  const handleNotify = () => {
    context.notify({
      title: 'Hello!',
      message: 'This is a notification from my plugin.',
      type: 'success',
    });
  };

  // Read from the Context Layer
  const loadData = async () => {
    const data = await context.readDomain('my-plugin');
    console.log('Saved data:', data);
  };

  // Write to the Context Layer
  const saveData = async () => {
    await context.writeDomain('my-plugin', {
      lastOpened: Date.now(),
      count: 42,
    });
  };

  // Read a file
  const readFile = async () => {
    const content = await context.readFile('/Documents/notes.txt');
    if (content) {
      const text = new TextDecoder().decode(content);
      console.log(text);
    }
  };

  return (
    <div>
      <button onClick={handleNotify}>Notify</button>
      <button onClick={loadData}>Load</button>
      <button onClick={saveData}>Save</button>
      <button onClick={readFile}>Read File</button>
    </div>
  );
}`} />

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Step 4: Test Locally</h2>
      <p className="text-white/70 text-sm mb-4">
        In development, test your plugin by importing it into the ContinuaOS app registry:
      </p>
      <CodeBlock language="tsx" code={`// In lib/app-manifest.ts
const appRegistry = {
  // ... existing apps
  'my-plugin': () => import('./path/to/my-plugin'),
};

// In APP_MANIFEST array
{ id: 'my-plugin', component: null, icon: FileText, title: 'My Plugin', roles: ['user'], isCore: false, category: 'productivity' }`} />

      <div className="bg-gradient-to-r from-[#22c55e]/10 to-[#16a34a]/10 border border-[#22c55e]/20 rounded-xl p-6 mt-8">
        <h3 className="text-white font-semibold mb-2">Next Steps</h3>
        <ul className="space-y-1 text-white/70 text-sm">
          <li>→ Learn about the <a href="/docs/sdk/api/plugin-context" className="text-[#00d4ff] hover:underline">PluginContext API</a></li>
          <li>→ Explore <a href="/docs/sdk/guides/filesystem" className="text-[#00d4ff] hover:underline">Filesystem Access</a></li>
          <li>→ Read about <a href="/docs/sdk/advanced/publishing" className="text-[#00d4ff] hover:underline">Publishing to the Marketplace</a></li>
        </ul>
      </div>
    </div>
  );
}
