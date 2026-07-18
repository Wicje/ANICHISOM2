import { CodeBlock } from '../../../code-block';

export default function AppPropsPage() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold text-white mb-2">AppProps</h1>
      <p className="text-white/50 text-lg mb-8">Props passed to your app component.</p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Interface</h2>
      <CodeBlock language="typescript" code={`interface AppProps {
  context: PluginContext;  // Access to all OS services
  focused: boolean;       // Whether this window is currently focused
  windowId: string;       // Unique ID for this window instance
}`} />

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Properties</h2>
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-4 py-2 text-white/50 font-medium">Property</th>
              <th className="text-left px-4 py-2 text-white/50 font-medium">Type</th>
              <th className="text-left px-4 py-2 text-white/50 font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-white/10">
              <td className="px-4 py-2 font-mono text-[#00d4ff]">context</td>
              <td className="px-4 py-2 text-white/70">PluginContext</td>
              <td className="px-4 py-2 text-white/70">Main API for accessing OS services</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="px-4 py-2 font-mono text-[#00d4ff]">focused</td>
              <td className="px-4 py-2 text-white/70">boolean</td>
              <td className="px-4 py-2 text-white/70">True when the window is active/focused</td>
            </tr>
            <tr>
              <td className="px-4 py-2 font-mono text-[#00d4ff]">windowId</td>
              <td className="px-4 py-2 text-white/70">string</td>
              <td className="px-4 py-2 text-white/70">Unique window instance ID</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Example</h2>
      <CodeBlock language="tsx" code={`function MyPlugin({ context, focused, windowId }: AppProps) {
  return (
    <div className={focused ? 'ring-2 ring-blue-500' : ''}>
      <p>Window ID: {windowId}</p>
      <p>Focused: {focused ? 'Yes' : 'No'}</p>
    </div>
  );
}`} />
    </div>
  );
}
