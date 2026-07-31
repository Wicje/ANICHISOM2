const fs = require('fs');

const path = 'components/apps/campaign-lab/index.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace the TS2322 error
content = content.replace(
  `{ id: crypto.randomUUID(), name: email, email, permission: permission as any || 'viewer' }`,
  `{ userId: crypto.randomUUID(), name: email, permission: permission as any || 'viewer' }`
);

const parts = content.split('const updateYDatabase = useCallback((id: string, updates: Partial<DatabaseSchema>) => {');
if (parts.length === 3) { // It exists exactly twice (so 3 parts)
  // Reconstruct keeping only the second one (which corresponds to parts[2])
  // Wait, let's just do an index-based replacement for safety.
  const target = `  const updateYDatabase = useCallback((id: string, updates: Partial<DatabaseSchema>) => {
    const yDatabases = collab.sharedTypesRef.current.databases;
    if (yDatabases) {
      const existing = yDatabases.get(id) || {};
      yDatabases.set(id, { ...existing, ...updates, id });
    }
  }, [collab]);

`;
  // Replace the first occurrence
  content = content.replace(target, '');
}

fs.writeFileSync(path, content);
