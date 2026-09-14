import { CodeBlock } from '../../../code-block';

export default function PluginContextPage() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold text-white mb-2">PluginContext</h1>
      <p className="text-white/50 text-lg mb-8">Access OS services through the context API.</p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Overview</h2>
      <p className="text-white/70 text-sm mb-6">
        Every ContinuaOS app receives a <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">context</code> prop
        that provides access to the operating system&apos;s services. This is your plugin&apos;s interface to the outside world.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">User &amp; Auth</h2>
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-4 py-2 text-white/50 font-medium">Method</th>
              <th className="text-left px-4 py-2 text-white/50 font-medium">Returns</th>
              <th className="text-left px-4 py-2 text-white/50 font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-white/10">
              <td className="px-4 py-2 font-mono text-[#00d4ff]">getUser()</td>
              <td className="px-4 py-2 text-white/70">User | null</td>
              <td className="px-4 py-2 text-white/70">Get the current authenticated user</td>
            </tr>
            <tr>
              <td className="px-4 py-2 font-mono text-[#00d4ff]">getRole()</td>
              <td className="px-4 py-2 text-white/70">UserRole</td>
              <td className="px-4 py-2 text-white/70">Get the user&apos;s role (filmmaker, developer, etc.)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <CodeBlock language="tsx" code={`function MyPlugin({ context }: AppProps) {
  const user = context.getUser();
  const role = context.getRole();
  
  // user = { id: 'abc', name: 'John', email: 'john@example.com', role: 'developer' }
  // role = 'developer'
}`} />

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Context Layer</h2>
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-4 py-2 text-white/50 font-medium">Method</th>
              <th className="text-left px-4 py-2 text-white/50 font-medium">Returns</th>
              <th className="text-left px-4 py-2 text-white/50 font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-white/10">
              <td className="px-4 py-2 font-mono text-[#00d4ff]">readDomain(domain)</td>
              <td className="px-4 py-2 text-white/70">Promise&lt;Record | null&gt;</td>
              <td className="px-4 py-2 text-white/70">Read a domain from persistent storage</td>
            </tr>
            <tr>
              <td className="px-4 py-2 font-mono text-[#00d4ff]">writeDomain(domain, data)</td>
              <td className="px-4 py-2 text-white/70">Promise&lt;void&gt;</td>
              <td className="px-4 py-2 text-white/70">Write data to a domain (persists across sessions)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <CodeBlock language="tsx" code={`// Read saved settings
const settings = await context.readDomain('my-plugin-settings');
// settings = { theme: 'dark', fontSize: 14 }

// Save settings
await context.writeDomain('my-plugin-settings', {
  theme: 'dark',
  fontSize: 16,
  lastUpdated: Date.now(),
});`} />

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Notifications</h2>
      <CodeBlock language="tsx" code={`context.notify({
  title: 'File Saved',
  message: 'Your document has been saved successfully.',
  type: 'success', // 'info' | 'success' | 'warning' | 'error'
  duration: 5000,
});`} />

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Filesystem</h2>
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-4 py-2 text-white/50 font-medium">Method</th>
              <th className="text-left px-4 py-2 text-white/50 font-medium">Returns</th>
              <th className="text-left px-4 py-2 text-white/50 font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-white/10">
              <td className="px-4 py-2 font-mono text-[#00d4ff]">readFile(path)</td>
              <td className="px-4 py-2 text-white/70">Promise&lt;ArrayBuffer | null&gt;</td>
              <td className="px-4 py-2 text-white/70">Read a file from the virtual filesystem</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="px-4 py-2 font-mono text-[#00d4ff]">writeFile(path, data)</td>
              <td className="px-4 py-2 text-white/70">Promise&lt;void&gt;</td>
              <td className="px-4 py-2 text-white/70">Write a file (ArrayBuffer, Blob, or string)</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="px-4 py-2 font-mono text-[#00d4ff]">createFolder(path)</td>
              <td className="px-4 py-2 text-white/70">Promise&lt;void&gt;</td>
              <td className="px-4 py-2 text-white/70">Create a new folder</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="px-4 py-2 font-mono text-[#00d4ff]">listDirectory(path)</td>
              <td className="px-4 py-2 text-white/70">Promise&lt;FileEntry[]&gt;</td>
              <td className="px-4 py-2 text-white/70">List files and folders in a directory</td>
            </tr>
            <tr>
              <td className="px-4 py-2 font-mono text-[#00d4ff]">delete(path)</td>
              <td className="px-4 py-2 text-white/70">Promise&lt;void&gt;</td>
              <td className="px-4 py-2 text-white/70">Delete a file or folder</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Modals</h2>
      <CodeBlock language="tsx" code={`const result = await context.showModal({
  title: 'Confirm Action',
  content: <p>Are you sure you want to continue?</p>,
  actions: [
    { label: 'Cancel', onClick: () => {}, variant: 'secondary' },
    { label: 'Confirm', onClick: () => {}, variant: 'primary' },
  ],
});

if (result.action === 'Confirm') {
  // User clicked confirm
}`} />

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Events</h2>
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-4 py-2 text-white/50 font-medium">Method</th>
              <th className="text-left px-4 py-2 text-white/50 font-medium">Returns</th>
              <th className="text-left px-4 py-2 text-white/50 font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-white/10">
              <td className="px-4 py-2 font-mono text-[#00d4ff]">onFsChange(cb)</td>
              <td className="px-4 py-2 text-white/70">() =&gt; void (unsubscribe)</td>
              <td className="px-4 py-2 text-white/70">Listen for filesystem changes</td>
            </tr>
            <tr>
              <td className="px-4 py-2 font-mono text-[#00d4ff]">onNotification(cb)</td>
              <td className="px-4 py-2 text-white/70">() =&gt; void (unsubscribe)</td>
              <td className="px-4 py-2 text-white/70">Listen for incoming notifications</td>
            </tr>
          </tbody>
        </table>
      </div>

      <CodeBlock language="tsx" code={`// Listen for filesystem changes
const unsubscribe = context.onFsChange((event) => {
  console.log('File changed:', event.type, event.path);
});

// Later: unsubscribe();
`} />
    </div>
  );
}
