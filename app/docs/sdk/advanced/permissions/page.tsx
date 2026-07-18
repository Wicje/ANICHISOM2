import { CodeBlock } from '../../../code-block';

export default function PermissionsPage() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold text-white mb-2">Permissions</h1>
      <p className="text-white/50 text-lg mb-8">Declare what your plugin needs access to.</p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Overview</h2>
      <p className="text-white/70 text-sm mb-6">
        Permissions are declared in your manifest and shown to users during installation.
        ContinuaOS enforces permissions at runtime — your plugin can only access what it declared.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Available Permissions</h2>
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-4 py-2 text-white/50 font-medium">Permission</th>
              <th className="text-left px-4 py-2 text-white/50 font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-white/10">
              <td className="px-4 py-2 font-mono text-[#00d4ff]">filesystem:read</td>
              <td className="px-4 py-2 text-white/70">Read files from the virtual filesystem</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="px-4 py-2 font-mono text-[#00d4ff]">filesystem:write</td>
              <td className="px-4 py-2 text-white/70">Write, create, and delete files</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="px-4 py-2 font-mono text-[#00d4ff]">camera</td>
              <td className="px-4 py-2 text-white/70">Access the device camera</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="px-4 py-2 font-mono text-[#00d4ff]">microphone</td>
              <td className="px-4 py-2 text-white/70">Access the device microphone</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="px-4 py-2 font-mono text-[#00d4ff]">notifications</td>
              <td className="px-4 py-2 text-white/70">Send system notifications</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="px-4 py-2 font-mono text-[#00d4ff]">clipboard:read</td>
              <td className="px-4 py-2 text-white/70">Read from the clipboard</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="px-4 py-2 font-mono text-[#00d4ff]">clipboard:write</td>
              <td className="px-4 py-2 text-white/70">Write to the clipboard</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="px-4 py-2 font-mono text-[#00d4ff]">network:fetch</td>
              <td className="px-4 py-2 text-white/70">Make external network requests</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="px-4 py-2 font-mono text-[#00d4ff]">storage:local</td>
              <td className="px-4 py-2 text-white/70">Access local storage (IndexedDB)</td>
            </tr>
            <tr>
              <td className="px-4 py-2 font-mono text-[#00d4ff]">storage:cloud</td>
              <td className="px-4 py-2 text-white/70">Access cloud storage (Google Drive, Dropbox)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Declaring Permissions</h2>
      <CodeBlock language="typescript" code={`const manifest: AppManifest = {
  id: 'my-plugin',
  title: 'My Plugin',
  // ...
  permissions: ['filesystem:read', 'filesystem:write', 'notifications'],
};`} />

      <div className="bg-gradient-to-r from-[#f59e0b]/10 to-[#f97316]/10 border border-[#f59e0b]/20 rounded-xl p-6 mt-8">
        <h3 className="text-white font-semibold mb-2">Security Note</h3>
        <p className="text-white/70 text-sm">
          Only request the permissions your plugin actually needs. Users see the permission list
          before installing. Excessive permissions reduce trust.
        </p>
      </div>
    </div>
  );
}
