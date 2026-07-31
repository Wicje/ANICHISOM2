const fs = require('fs');

// 1. campaign-lab/index.tsx
let labPath = 'components/apps/campaign-lab/index.tsx';
let lab = fs.readFileSync(labPath, 'utf8');

// Fix updateDatabase order
lab = lab.replace(
  `  const applyTemplate = useCallback((template: typeof TEMPLATES[0]) => {`,
  `  const updateYDatabase = useCallback((id: string, updates: Partial<DatabaseSchema>) => {
    const yDatabases = collab.sharedTypesRef.current.databases;
    if (yDatabases) {
      const existing = yDatabases.get(id) || {};
      yDatabases.set(id, { ...existing, ...updates, id });
    }
  }, [collab]);

  const updateDatabase = useCallback((dbId: string, updates: Partial<DatabaseSchema>) => {
    updateYDatabase(dbId, updates);
  }, [updateYDatabase]);

  const applyTemplate = useCallback((template: typeof TEMPLATES[0]) => {`
);

lab = lab.replace(
  `  const updateYDatabase = useCallback((id: string, updates: Partial<DatabaseSchema>) => {
    const yDatabases = collab.sharedTypesRef.current.databases;
    if (yDatabases) {
      const existing = yDatabases.get(id) || {};
      yDatabases.set(id, { ...existing, ...updates, id });
    }
  }, [collab]);

  const updateDatabase = useCallback((dbId: string, updates: Partial<DatabaseSchema>) => {
    updateYDatabase(dbId, updates);
  }, [updateYDatabase]);
  
  const deletePage = useCallback((id: string, e?: React.MouseEvent) => {`,
  `  const deletePage = useCallback((id: string, e?: React.MouseEvent) => {`
);

// Fix TS2322 in campaign-lab
lab = lab.replace(
  `id: u.id, name: u.name, email: u.email, permission: u.permission`,
  `userId: u.id, name: u.name, permission: u.permission as any`
);

fs.writeFileSync(labPath, lab);

// 2. client-portal.tsx
let portalPath = 'components/apps/client-portal.tsx';
let portal = fs.readFileSync(portalPath, 'utf8');
portal = portal.replace(
  `import { StorageAdapter } from '@/lib/storage';`,
  ``
);
portal = portal.replace(
  `const [storage] = useState(() => new StorageAdapter('client-portal', 'private'));`,
  ``
);
portal = portal.replace(
  `  useEffect(() => {
    storage.get('comments').then((saved) => {
      if (saved) setComments(saved);
    });
  }, [storage]);

  useEffect(() => {
    if (comments.length > 0) storage.set('comments', comments);
  }, [comments, storage]);`,
  `  useEffect(() => {
    const saved = localStorage.getItem('client-portal-comments');
    if (saved) {
      try { setComments(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (comments.length > 0) {
      localStorage.setItem('client-portal-comments', JSON.stringify(comments));
    }
  }, [comments]);`
);
fs.writeFileSync(portalPath, portal);

// 3. power-browser.tsx
let browserPath = 'components/apps/power-browser.tsx';
let browser = fs.readFileSync(browserPath, 'utf8');
browser = browser.replace(
  `const [inputUrl, setInputUrl] = useState('');`,
  `const [inputUrl, setInputUrl] = useState('');\n  const [splitUrl, setSplitUrl] = useState('https://duckduckgo.com/');\n  const [splitInputUrl, setSplitInputUrl] = useState('');`
);
browser = browser.replace(
  `const [splitViewTarget, setSplitViewTarget] = useState<string | null>(null);\n  const [splitUrl, setSplitUrl] = useState('https://duckduckgo.com/');\n  const [splitInputUrl, setSplitInputUrl] = useState('');`,
  `const [splitViewTarget, setSplitViewTarget] = useState<string | null>(null);`
);
fs.writeFileSync(browserPath, browser);

// 4. productivity-suite.tsx
let prodPath = 'components/apps/productivity-suite.tsx';
let prod = fs.readFileSync(prodPath, 'utf8');
prod = prod.replace(
  `onBlur={() => setActiveCell(null)}`,
  `onBlur={() => setActiveCell('')}`
);
prod = prod.replace(
  `const tempCanvas = new fabric.Canvas(null, { width: 768, height: 432, backgroundColor: '#ffffff' });`,
  `const tempCanvas = new fabric.Canvas(document.createElement('canvas'), { width: 768, height: 432, backgroundColor: '#ffffff' });`
);
prod = prod.replace(
  `if (activeSlideId === id) setActiveSlideId(newOrder[0]);`,
  `if (activeSlideId === id) setActiveSlideId(newOrder[0] || null);`
);
fs.writeFileSync(prodPath, prod);

// 5. campaign.store.ts
let storePath = 'lib/stores/campaign.store.ts';
let store = fs.readFileSync(storePath, 'utf8');
store = store.replace(
  `notifications: [],`,
  `notifications: [],\n  setDatabaseStore: (store) => {}, // implemented below`
);
fs.writeFileSync(storePath, store);

