import { CodeBlock } from '../../../code-block';

export default function RegisterAppPage() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold text-white mb-2">registerApp()</h1>
      <p className="text-white/50 text-lg mb-8">Register a plugin with ContinuaOS.</p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Signature</h2>
      <CodeBlock language="typescript" code={`function registerApp(
  manifest: AppManifest,
  component: React.ComponentType<AppProps>
): AppComponent`} />

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Parameters</h2>
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-4 py-2 text-white/50 font-medium">Parameter</th>
              <th className="text-left px-4 py-2 text-white/50 font-medium">Type</th>
              <th className="text-left px-4 py-2 text-white/50 font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-white/10">
              <td className="px-4 py-2 font-mono text-[#00d4ff]">manifest</td>
              <td className="px-4 py-2 text-white/70">AppManifest</td>
              <td className="px-4 py-2 text-white/70">App metadata (id, title, version, etc.)</td>
            </tr>
            <tr>
              <td className="px-4 py-2 font-mono text-[#00d4ff]">component</td>
              <td className="px-4 py-2 text-white/70">React.ComponentType&lt;AppProps&gt;</td>
              <td className="px-4 py-2 text-white/70">The React component to render</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Returns</h2>
      <p className="text-white/70 text-sm mb-4">
        Returns an <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">AppComponent</code> object with the app&apos;s <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">id</code> and <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">component</code>.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Validation</h2>
      <p className="text-white/70 text-sm mb-4">
        The function validates the manifest and throws errors for:
      </p>
      <ul className="space-y-1 text-white/70 text-sm mb-6">
        <li>• Missing <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">id</code> field</li>
        <li>• Missing <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">title</code> field</li>
        <li>• Missing <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">version</code> field</li>
        <li>• Component is not a valid React component</li>
      </ul>

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Example</h2>
      <CodeBlock language="tsx" code={`import { registerApp } from 'continuaos-sdk';
import type { AppManifest, AppProps } from 'continuaos-sdk';

const manifest: AppManifest = {
  id: 'todo-list',
  title: 'Todo List',
  description: 'A simple todo list app',
  version: '1.0.0',
  author: 'Developer',
  category: 'productivity',
  icon: 'CheckSquare',
  roles: ['user', 'admin'],
};

function TodoList({ context }: AppProps) {
  return <div>My Todo List</div>;
}

const app = registerApp(manifest, TodoList);
console.log(app.id); // "todo-list"`} />
    </div>
  );
}
