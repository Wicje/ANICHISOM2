import { CodeBlock } from '../../../code-block';

export default function AppManifestPage() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold text-white mb-2">AppManifest</h1>
      <p className="text-white/50 text-lg mb-8">Define your plugin&apos;s metadata.</p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Interface</h2>
      <CodeBlock language="typescript" code={`interface AppManifest {
  id: string;            // Unique identifier (e.g., 'my-plugin')
  title: string;         // Display name
  description: string;   // What the app does
  version: string;       // Semver (e.g., '1.0.0')
  author: string;        // Your name
  category: AppCategory; // One of the categories below
  icon: string;          // Lucide icon name OR image URL
  roles: UserRole[];     // Who can access this app
  size?: { width: number; height: number };       // Initial window size
  minSize?: { width: number; height: number };    // Minimum window size
  multiInstance?: boolean;                        // Allow multiple windows
  tags?: string[];       // For searchability
  permissions?: AppPermission[];                  // Required permissions
}`} />

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Categories</h2>
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden mb-6">
        <table className="w-full text-sm">
          <tbody>
            {['productivity', 'creative', 'development', 'media', 'system', 'games', 'utilities', 'social', 'finance', 'education'].map((cat) => (
              <tr key={cat} className="border-b border-white/10 last:border-0">
                <td className="px-4 py-2 font-mono text-[#00d4ff]">{cat}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Roles</h2>
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden mb-6">
        <table className="w-full text-sm">
          <tbody>
            {['filmmaker', 'photographer', 'developer', 'designer', 'marketer', 'business', 'student', 'other', 'user', 'admin'].map((role) => (
              <tr key={role} className="border-b border-white/10 last:border-0">
                <td className="px-4 py-2 font-mono text-[#00d4ff]">{role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Permissions</h2>
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden mb-6">
        <table className="w-full text-sm">
          <tbody>
            {['filesystem:read', 'filesystem:write', 'camera', 'microphone', 'notifications', 'clipboard:read', 'clipboard:write', 'network:fetch', 'storage:local', 'storage:cloud'].map((perm) => (
              <tr key={perm} className="border-b border-white/10 last:border-0">
                <td className="px-4 py-2 font-mono text-[#00d4ff]">{perm}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Example</h2>
      <CodeBlock language="typescript" code={`const manifest: AppManifest = {
  id: 'screen-recorder',
  title: 'Screen Recorder',
  description: 'Record your screen with audio',
  version: '1.0.0',
  author: 'ContinuaOS Team',
  category: 'media',
  icon: 'Video',
  roles: ['user', 'admin'],
  size: { width: 400, height: 300 },
  minSize: { width: 300, height: 200 },
  multiInstance: false,
  tags: ['screen', 'record', 'video'],
  permissions: ['microphone', 'notifications'],
};`} />
    </div>
  );
}
