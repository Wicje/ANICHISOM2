import { CodeBlock } from '../../../code-block';

export default function VersionsPage() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold text-white mb-2">Version Management</h1>
      <p className="text-white/50 text-lg mb-8">Handle plugin upgrades and migrations.</p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Semantic Versioning</h2>
      <p className="text-white/70 text-sm mb-6">
        ContinuaOS uses semver for plugin versions. Your manifest&apos;s <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">version</code> field must follow the <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">MAJOR.MINOR.PATCH</code> format.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Version Comparison</h2>
      <CodeBlock language="typescript" code={`import { compareVersions, satisfiesRange } from 'continuaos-sdk';

// Compare two versions
compareVersions('2.0.0', '1.0.0');  // 1 (a > b)
compareVersions('1.0.0', '1.0.0');  // 0 (equal)
compareVersions('1.0.0', '2.0.0');  // -1 (a < b)

// Check version ranges
satisfiesRange('1.2.3', '^1.0.0');  // true (compatible with 1.x)
satisfiesRange('2.0.0', '^1.0.0');  // false (different major)
satisfiesRange('1.2.3', '~1.2.0');  // true (same minor)
satisfiesRange('1.3.0', '~1.2.0');  // false (different minor)`} />

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Migration System</h2>
      <p className="text-white/70 text-sm mb-4">
        Define migrations to transform data between versions:
      </p>
      <CodeBlock language="typescript" code={`import { getMigrationPath, applyMigrations, type Migration } from 'continuaos-sdk';

const migrations: Migration[] = [
  {
    fromVersion: '1.0.0',
    toVersion: '1.1.0',
    description: 'Add theme setting',
    migrate: (data) => ({ ...data, theme: 'dark' }),
  },
  {
    fromVersion: '1.1.0',
    toVersion: '2.0.0',
    description: 'Restructure settings',
    migrate: (data) => ({
      settings: { theme: data.theme, version: 2 },
    }),
  },
];

// Get the migration path
const path = getMigrationPath(migrations, '1.0.0', '2.0.0');
// Returns: [migration 1→1.1, migration 1.1→2.0]

// Apply migrations
const newData = applyMigrations(oldData, path);`} />
    </div>
  );
}
