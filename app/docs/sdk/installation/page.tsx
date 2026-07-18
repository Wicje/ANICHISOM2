import { CodeBlock } from '../../code-block';

export default function InstallationPage() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold text-white mb-2">Installation</h1>
      <p className="text-white/50 text-lg mb-8">Get started with the ContinuaOS SDK.</p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Prerequisites</h2>
      <ul className="space-y-1 text-white/70 text-sm mb-6">
        <li>Node.js 18+ and npm/yarn/pnpm</li>
        <li>React 18+ (peer dependency)</li>
        <li>TypeScript (recommended)</li>
      </ul>

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Install</h2>
      <CodeBlock language="bash" code={`npm install continuaos-sdk`} filename="Terminal" />

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Peer Dependencies</h2>
      <p className="text-white/70 text-sm mb-4">
        The SDK requires React as a peer dependency. If you don&apos;t already have it:
      </p>
      <CodeBlock language="bash" code={`npm install react react-dom`} filename="Terminal" />

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">TypeScript Setup</h2>
      <p className="text-white/70 text-sm mb-4">
        The SDK includes TypeScript declarations. Add it to your <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">tsconfig.json</code>:
      </p>
      <CodeBlock language="json" code={`{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true
  }
}`} filename="tsconfig.json" />

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Verify Installation</h2>
      <CodeBlock language="tsx" code={`import { registerApp, SDK_VERSION } from 'continuaos-sdk';

console.log('ContinuaOS SDK version:', SDK_VERSION);
// → "1.0.0"`} />
    </div>
  );
}
