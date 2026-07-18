import { CodeBlock } from '../../../code-block';

export default function ShortcutsGuidePage() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold text-white mb-2">Keyboard Shortcuts</h1>
      <p className="text-white/50 text-lg mb-8">Register global keyboard shortcuts.</p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Using the createShortcut Helper</h2>
      <CodeBlock language="tsx" code={`import { createShortcut } from 'continuaos-sdk';

const shortcut = createShortcut('s', handleSave, {
  ctrl: true,  // Ctrl (or Cmd on Mac)
  shift: false,
  alt: false,
  meta: false,
});`} />

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Registering in a Component</h2>
      <CodeBlock language="tsx" code={`function MyPlugin({ context }: AppProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S → Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return <div>Press Ctrl+S to save</div>;
}`} />

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Common Shortcuts</h2>
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-4 py-2 text-white/50 font-medium">Shortcut</th>
              <th className="text-left px-4 py-2 text-white/50 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-white/10">
              <td className="px-4 py-2 font-mono text-[#00d4ff]">Ctrl/Cmd + S</td>
              <td className="px-4 py-2 text-white/70">Save</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="px-4 py-2 font-mono text-[#00d4ff]">Ctrl/Cmd + Z</td>
              <td className="px-4 py-2 text-white/70">Undo</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="px-4 py-2 font-mono text-[#00d4ff]">Ctrl/Cmd + Shift + Z</td>
              <td className="px-4 py-2 text-white/70">Redo</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="px-4 py-2 font-mono text-[#00d4ff]">Ctrl/Cmd + N</td>
              <td className="px-4 py-2 text-white/70">New</td>
            </tr>
            <tr>
              <td className="px-4 py-2 font-mono text-[#00d4ff]">Ctrl/Cmd + K</td>
              <td className="px-4 py-2 text-white/70">Open Command Palette</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
