const fs = require('fs');
const path = '/home/zk3/workstation/experiments/ANICHISOM2/components/apps/productivity-suite.tsx';
let code = fs.readFileSync(path, 'utf-8');

// 1. Change wordEditor state to ref and add toolbar tick
code = code.replace(
  `const [wordEditor, setWordEditor] = useState<Editor | null>(null);`,
  `const wordEditorRef = useRef<Editor | null>(null);
  const [wordToolbarTick, setWordToolbarTick] = useState(0);`
);

// 2. Change onEditorReady to update ref
code = code.replace(
  `<WordEditor performanceMode={performanceMode} workspaceMode={workspaceMode} projectId={projectId} currentUser={currentUser} onEditorReady={setWordEditor} collab={collab} onDirty={() => setSaveStatus('unsaved')} />`,
  `<WordEditor performanceMode={performanceMode} workspaceMode={workspaceMode} projectId={projectId} currentUser={currentUser} onEditorReady={(editor) => { wordEditorRef.current = editor; setWordToolbarTick(t => t + 1); }} collab={collab} onDirty={() => setSaveStatus('unsaved')} />`
);

// 3. Update 'we' reference
code = code.replace(
  `const we = wordEditor && !wordEditor.isDestroyed ? wordEditor : null;`,
  `const we = wordEditorRef.current && !wordEditorRef.current.isDestroyed ? wordEditorRef.current : null;`
);

// 4. Remove onUpdate/onSelectionUpdate spam from WordEditor
code = code.replace(
  `    onUpdate: ({ editor }) => {
       onEditorReady(editor);
       onDirty?.();
    },
    onSelectionUpdate: ({ editor }) => {
       onEditorReady(editor);
    },`,
  `    onUpdate: ({ editor }) => {
       onDirty?.();
    },
    onSelectionUpdate: ({ editor }) => {
       onEditorReady(editor);
    },`
);

fs.writeFileSync(path, code);
console.log('MAJ-7 Word Editor re-render fixed.');
