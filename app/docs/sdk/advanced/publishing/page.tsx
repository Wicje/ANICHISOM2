import { CodeBlock } from '../../../code-block';

export default function PublishingPage() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold text-white mb-2">Publishing</h1>
      <p className="text-white/50 text-lg mb-8">Submit your plugin to the ContinuaOS Marketplace.</p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Overview</h2>
      <p className="text-white/70 text-sm mb-6">
        Once your plugin is ready, you can submit it to the ContinuaOS Marketplace for other users to discover and install.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Step 1: Prepare Your Plugin</h2>
      <ul className="space-y-2 text-white/70 text-sm mb-6">
        <li className="flex items-start gap-2">
          <span className="text-[#00d4ff] mt-0.5">1.</span>
          <span>Set a proper <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">version</code> in your manifest (e.g., <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">1.0.0</code>)</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-[#00d4ff] mt-0.5">2.</span>
          <span>Declare all required <a href="/docs/sdk/advanced/permissions" className="text-[#00d4ff] hover:underline">permissions</a></span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-[#00d4ff] mt-0.5">3.</span>
          <span>Test thoroughly in the Plugin Sandbox</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-[#00d4ff] mt-0.5">4.</span>
          <span>Host your plugin&apos;s manifest at a public URL</span>
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Step 2: Submit for Review</h2>
      <CodeBlock language="bash" code={`# Via the API
curl -X POST https://your-app.com/api/marketplace \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "My Plugin",
    "description": "A useful plugin for creativity",
    "version": "1.0.0",
    "category": "productivity",
    "icon": "Puzzle",
    "manifestUrl": "https://example.com/manifest.json",
    "permissions": ["filesystem:read", "notifications"],
    "tags": ["productivity", "notes"]
  }'`} />

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Step 3: Review Process</h2>
      <p className="text-white/70 text-sm mb-4">
        After submission, a ContinuaOS admin will review your plugin. The review checks for:
      </p>
      <ul className="space-y-1 text-white/70 text-sm mb-6">
        <li>• Security (no malicious code, proper sandboxing)</li>
        <li>• Functionality (app works as described)</li>
        <li>• Quality (UI follows OS design patterns)</li>
        <li>• Permissions (only necessary permissions requested)</li>
      </ul>

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Step 4: Published!</h2>
      <p className="text-white/70 text-sm mb-4">
        Once approved, your plugin appears in the App Store. Users can install it with one click.
        You&apos;ll receive an email notification when your plugin is published.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Version Updates</h2>
      <p className="text-white/70 text-sm mb-4">
        To publish an update, submit a new version through the same process. Users will be notified of the update.
      </p>

      <div className="bg-gradient-to-r from-[#22c55e]/10 to-[#16a34a]/10 border border-[#22c55e]/20 rounded-xl p-6 mt-8">
        <h3 className="text-white font-semibold mb-2">Tips for Approval</h3>
        <ul className="space-y-1 text-white/70 text-sm">
          <li>• Include a clear, concise description</li>
          <li>• Add relevant tags for discoverability</li>
          <li>• Provide screenshots or a demo video</li>
          <li>• Respond quickly to review feedback</li>
        </ul>
      </div>
    </div>
  );
}
