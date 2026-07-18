import { CodeBlock } from '../../../code-block';

export default function ContextLayerGuidePage() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold text-white mb-2">Context Layer</h1>
      <p className="text-white/50 text-lg mb-8">Persist data across sessions.</p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Overview</h2>
      <p className="text-white/70 text-sm mb-6">
        The Context Layer is a key-value store that persists your plugin&apos;s data across sessions.
        Data is stored locally in IndexedDB and optionally synced to the cloud.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Reading Data</h2>
      <CodeBlock language="tsx" code={`const data = await context.readDomain('my-plugin');
// data = { theme: 'dark', lastOpened: 1234567890, count: 42 }
// or null if no data has been saved yet`} />

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Writing Data</h2>
      <CodeBlock language="tsx" code={`await context.writeDomain('my-plugin', {
  theme: 'dark',
  lastOpened: Date.now(),
  count: 42,
});`} />

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Best Practices</h2>
      <ul className="space-y-2 text-white/70 text-sm">
        <li className="flex items-start gap-2">
          <span className="text-[#00d4ff] mt-0.5">•</span>
          <span>Use a unique domain name for each plugin (e.g., <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">todo-list-settings</code>)</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-[#00d4ff] mt-0.5">•</span>
          <span>Store only small data (up to ~1MB). Use the filesystem for large files.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-[#00d4ff] mt-0.5">•</span>
          <span>Handle null returns gracefully (first launch has no data)</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-[#00d4ff] mt-0.5">•</span>
          <span>Merge data instead of overwriting when possible</span>
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Example: Settings Persistence</h2>
      <CodeBlock language="tsx" code={`function MyPlugin({ context }: AppProps) {
  const [settings, setSettings] = useState({ theme: 'dark', fontSize: 14 });

  // Load on mount
  useEffect(() => {
    context.readDomain('my-plugin-settings').then(data => {
      if (data) setSettings(data as any);
    });
  }, []);

  // Save on change
  const updateSetting = async (key: string, value: any) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await context.writeDomain('my-plugin-settings', updated);
  };

  return (
    <div>
      <select onChange={e => updateSetting('theme', e.target.value)} value={settings.theme}>
        <option value="dark">Dark</option>
        <option value="light">Light</option>
      </select>
    </div>
  );
}`} />
    </div>
  );
}
