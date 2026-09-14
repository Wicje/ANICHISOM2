import { CodeBlock } from '../../../code-block';

export default function FilesystemGuidePage() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold text-white mb-2">Filesystem Access</h1>
      <p className="text-white/50 text-lg mb-8">Read, write, and manage files in the virtual filesystem.</p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Overview</h2>
      <p className="text-white/70 text-sm mb-6">
        ContinuaOS provides a virtual filesystem backed by the browser&apos;s Origin Private File System (OPFS).
        Your plugin can read, write, and manage files without worrying about the underlying implementation.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Reading Files</h2>
      <CodeBlock language="tsx" code={`function MyPlugin({ context }: AppProps) {
  const handleRead = async () => {
    // Read as ArrayBuffer
    const buffer = await context.readFile('/Documents/notes.txt');
    if (buffer) {
      const text = new TextDecoder().decode(buffer);
      console.log(text);
    }
  };

  return <button onClick={handleRead}>Read File</button>;
}`} />

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Writing Files</h2>
      <CodeBlock language="tsx" code={`const handleSave = async () => {
  // Write a string
  await context.writeFile('/Documents/notes.txt', 'Hello, world!');

  // Write an ArrayBuffer
  const encoder = new TextEncoder();
  const data = encoder.encode('Binary data');
  await context.writeFile('/Documents/data.bin', data);

  // Write a Blob
  const blob = new Blob(['Blob content'], { type: 'text/plain' });
  await context.writeFile('/Documents/blob.txt', blob);
};`} />

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Creating Folders</h2>
      <CodeBlock language="tsx" code={`const handleCreateFolder = async () => {
  await context.createFolder('/My App/Projects');
};`} />

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Listing Directories</h2>
      <CodeBlock language="tsx" code={`const handleList = async () => {
  const entries = await context.listDirectory('/Documents');
  // entries = [
  //   { name: 'notes.txt', path: '/Documents/notes.txt', isFolder: false, size: 1024 },
  //   { name: 'Projects', path: '/Documents/Projects', isFolder: true },
  // ]
};`} />

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Deleting Files</h2>
      <CodeBlock language="tsx" code={`const handleDelete = async () => {
  await context.delete('/Documents/old-file.txt');
};`} />

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Listening for Changes</h2>
      <CodeBlock language="tsx" code={`useEffect(() => {
  const unsubscribe = context.onFsChange((event) => {
    console.log('Change:', event.type, event.path);
    // event.type: 'create' | 'update' | 'delete' | 'move' | 'copy'
  });

  return unsubscribe;
}, []);`} />

      <div className="bg-gradient-to-r from-[#00d4ff]/10 to-[#7c3aed]/10 border border-[#00d4ff]/20 rounded-xl p-6 mt-8">
        <h3 className="text-white font-semibold mb-2">Privacy Note</h3>
        <p className="text-white/70 text-sm">
          All filesystem operations happen locally in the browser. No file data is sent to any server
          unless your plugin explicitly does so.
        </p>
      </div>
    </div>
  );
}
