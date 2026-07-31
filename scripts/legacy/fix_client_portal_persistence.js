const fs = require('fs');

const filePath = 'components/apps/client-portal.tsx';
let code = fs.readFileSync(filePath, 'utf-8');

if (!code.includes('StorageAdapter')) {
  code = code.replace(
    `import React, { useState, useMemo, useEffect, useRef } from 'react';`,
    `import React, { useState, useMemo, useEffect, useRef } from 'react';\nimport { StorageAdapter } from '@/lib/storage';`
  );

  code = code.replace(
    `export function ClientPortal({ window: osWindow }: { window: OSWindow }) {`,
    `export function ClientPortal({ window: osWindow }: { window: OSWindow }) {\n  const [storage] = useState(() => new StorageAdapter('client-portal', 'private'));`
  );

  code = code.replace(
    `const [comments, setComments] = useState<PortalComment[]>([]);`,
    `const [comments, setComments] = useState<PortalComment[]>([]);\n\n  useEffect(() => {\n    storage.get('comments').then((saved) => {\n      if (saved) setComments(saved);\n    });\n  }, [storage]);\n\n  useEffect(() => {\n    if (comments.length > 0) storage.set('comments', comments);\n  }, [comments, storage]);`
  );

  fs.writeFileSync(filePath, code);
  console.log('Fixed client portal persistence');
}

