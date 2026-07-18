import { CodeBlock } from '../code-block';

export default function SDKDocsPage() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold text-white mb-2">ContinuaOS SDK</h1>
      <p className="text-white/50 text-lg mb-8">Build plugins for the ContinuaOS platform.</p>

      <div className="bg-gradient-to-r from-[#00d4ff]/10 to-[#7c3aed]/10 border border-[#00d4ff]/20 rounded-xl p-6 mb-8">
        <h2 className="text-white font-semibold mb-2">What is the ContinuaOS SDK?</h2>
        <p className="text-white/70 text-sm leading-relaxed">
          The ContinuaOS SDK lets you build, test, and publish plugins that run inside the ContinuaOS
          operating system. Plugins get access to the filesystem, notifications, context layer, modals,
          and more — all through a secure sandboxed API.
        </p>
      </div>

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Quick Example</h2>
      <CodeBlock language="tsx" code={`import { registerApp } from 'continuaos-sdk';
import type { AppManifest, AppProps } from 'continuaos-sdk';

const manifest: AppManifest = {
  id: 'my-plugin',
  title: 'My Plugin',
  description: 'A custom plugin for ContinuaOS',
  version: '1.0.0',
  author: 'Developer',
  category: 'utilities',
  icon: 'Plug',
  roles: ['user', 'admin'],
};

function MyApp({ context }: AppProps) {
  const user = context.getUser();
  
  return (
    <div>
      <h1>Hello, {user?.name || 'Guest'}!</h1>
      <button onClick={() => context.notify({
        title: 'Hello!',
        message: 'This is a notification from my plugin.',
      })}>
        Notify
      </button>
    </div>
  );
}

registerApp(manifest, MyApp);`} />

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Features</h2>
      <ul className="space-y-2 text-white/70 text-sm">
        <li className="flex items-start gap-2">
          <span className="text-[#00d4ff] mt-0.5">•</span>
          <span><strong className="text-white">Filesystem</strong> — Read, write, and manage files in the virtual filesystem</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-[#00d4ff] mt-0.5">•</span>
          <span><strong className="text-white">Context Layer</strong> — Persist data across sessions with the Context Layer API</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-[#00d4ff] mt-0.5">•</span>
          <span><strong className="text-white">Notifications</strong> — Send system notifications to users</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-[#00d4ff] mt-0.5">•</span>
          <span><strong className="text-white">Modals</strong> — Show custom dialogs and prompts</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-[#00d4ff] mt-0.5">•</span>
          <span><strong className="text-white">Cloud Storage</strong> — Access Google Drive, Dropbox, OneDrive</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-[#00d4ff] mt-0.5">•</span>
          <span><strong className="text-white">TypeScript</strong> — Full type definitions and autocomplete</span>
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Next Steps</h2>
      <div className="grid grid-cols-2 gap-4">
        <a href="/docs/sdk/installation" className="block bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors">
          <h3 className="text-white font-medium mb-1">Installation →</h3>
          <p className="text-white/50 text-sm">Install the SDK and set up your project.</p>
        </a>
        <a href="/docs/sdk/quickstart" className="block bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors">
          <h3 className="text-white font-medium mb-1">Quick Start →</h3>
          <p className="text-white/50 text-sm">Build your first plugin in 5 minutes.</p>
        </a>
      </div>
    </div>
  );
}
