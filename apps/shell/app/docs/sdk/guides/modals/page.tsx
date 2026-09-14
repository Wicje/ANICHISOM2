import { CodeBlock } from '../../../code-block';

export default function ModalsGuidePage() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold text-white mb-2">Modals &amp; Notifications</h1>
      <p className="text-white/50 text-lg mb-8">Show dialogs and alerts to users.</p>

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Notifications</h2>
      <CodeBlock language="tsx" code={`// Simple notification
context.notify({
  title: 'Saved!',
  message: 'Your file has been saved.',
  type: 'success',
});

// With custom duration
context.notify({
  title: 'Upload Complete',
  message: '3 files uploaded successfully.',
  type: 'info',
  duration: 3000,
});`} />

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Notification Types</h2>
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden mb-6">
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-white/10">
              <td className="px-4 py-2 font-mono text-green-400">success</td>
              <td className="px-4 py-2 text-white/70">Green — operation succeeded</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="px-4 py-2 font-mono text-blue-400">info</td>
              <td className="px-4 py-2 text-white/70">Blue — informational message</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="px-4 py-2 font-mono text-yellow-400">warning</td>
              <td className="px-4 py-2 text-white/70">Yellow — something needs attention</td>
            </tr>
            <tr>
              <td className="px-4 py-2 font-mono text-red-400">error</td>
              <td className="px-4 py-2 text-white/70">Red — an error occurred</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold text-white mt-8 mb-4">Modal Dialogs</h2>
      <CodeBlock language="tsx" code={`const result = await context.showModal({
  title: 'Delete File',
  content: (
    <div>
      <p>Are you sure you want to delete <strong>notes.txt</strong>?</p>
      <p className="text-sm text-white/50 mt-2">This action cannot be undone.</p>
    </div>
  ),
  actions: [
    { label: 'Cancel', onClick: () => {}, variant: 'secondary' },
    { label: 'Delete', onClick: () => {}, variant: 'danger' },
  ],
});

if (result.action === 'Delete') {
  await context.delete('/Documents/notes.txt');
  context.notify({ title: 'Deleted', message: 'File deleted.', type: 'success' });
}`} />
    </div>
  );
}
