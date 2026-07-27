const fs = require('fs');

// 1. Update CampaignStore to include setDatabaseStore
const storePath = 'lib/stores/campaign.store.ts';
let storeCode = fs.readFileSync(storePath, 'utf-8');

if (!storeCode.includes('setDatabaseStore:')) {
  storeCode = storeCode.replace(
    `addDatabase: (schema: DatabaseSchema) => void;`,
    `addDatabase: (schema: DatabaseSchema) => void;\n  setDatabaseStore: (store: DatabaseStore) => void;`
  );
  storeCode = storeCode.replace(
    `addDatabase: (schema) => set((state) => ({\n      databaseStore: { ...state.databaseStore, [schema.id]: schema }\n    })),`,
    `addDatabase: (schema) => set((state) => ({\n      databaseStore: { ...state.databaseStore, [schema.id]: schema }\n    })),\n  setDatabaseStore: (store) => set({ databaseStore: store }),`
  );
  
  // Also remove 'databaseStore' from persistence since Yjs handles it now!
  storeCode = storeCode.replace(
    `['databaseStore', 'linkedDatabases', 'campaignShares', 'notifications']`,
    `['linkedDatabases', 'campaignShares', 'notifications']`
  );

  fs.writeFileSync(storePath, storeCode);
  console.log('Updated campaign.store.ts');
}

// 2. Sync Yjs Databases -> Zustand in campaign-lab/index.tsx
const labPath = 'components/apps/campaign-lab/index.tsx';
let labCode = fs.readFileSync(labPath, 'utf-8');

if (!labCode.includes('const yDatabases = collab.sharedTypesRef.current.databases;')) {
  labCode = labCode.replace(
    `const yPages = collab.sharedTypesRef.current.pages;
    if (!yPages) return;

    const syncPages = () => {`,
    `const yPages = collab.sharedTypesRef.current.pages;
    const yDatabases = collab.sharedTypesRef.current.databases;
    if (!yPages || !yDatabases) return;

    const syncPages = () => {`
  );
  
  labCode = labCode.replace(
    `syncPages();
    yPages.observe(syncPages);
    return () => yPages.unobserve(syncPages);`,
    `syncPages();
    yPages.observe(syncPages);
    
    const syncDatabases = () => {
      const dbMap = Object.fromEntries(yDatabases.entries());
      store.setDatabaseStore(dbMap);
    };
    syncDatabases();
    yDatabases.observe(syncDatabases);
    
    return () => {
      yPages.unobserve(syncPages);
      yDatabases.unobserve(syncDatabases);
    };`
  );
  
  // Add updateYDatabase
  labCode = labCode.replace(
    `  const deleteYPage = useCallback((id: string) => {`,
    `  const updateYDatabase = useCallback((id: string, updates: Partial<DatabaseSchema>) => {
    const yDatabases = collab.sharedTypesRef.current.databases;
    if (yDatabases) {
      const existing = yDatabases.get(id) || {};
      yDatabases.set(id, { ...existing, ...updates, id });
    }
  }, [collab]);

  const deleteYPage = useCallback((id: string) => {`
  );

  // Hook up updateYDatabase in the UI layer
  labCode = labCode.replace(
    `updateDatabase, getBreadcrumbs`,
    `updateDatabase: storeUpdateDatabase, getBreadcrumbs, setDatabaseStore`
  );

  labCode = labCode.replace(
    `const deletePage = useCallback((id: string, e?: React.MouseEvent) => {`,
    `const updateDatabase = useCallback((dbId: string, updates: Partial<DatabaseSchema>) => {
    updateYDatabase(dbId, updates);
  }, [updateYDatabase]);
  
  const deletePage = useCallback((id: string, e?: React.MouseEvent) => {`
  );
  
  // Fix the updateDatabase call in applyTemplate
  labCode = labCode.replace(
    `updateDatabase(dbId, defaultDb);`,
    `updateYDatabase(dbId, defaultDb);`
  );
  
  fs.writeFileSync(labPath, labCode);
  console.log('Updated campaign-lab/index.tsx');
}
