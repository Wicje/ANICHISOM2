import type { Metadata } from 'next';
import { Sidebar } from './sidebar';
import { Content } from './content';

export const metadata: Metadata = {
  title: 'ContinuaOS SDK — Build Plugins',
  description: 'Build plugins for the ContinuaOS platform with the official SDK.',
};

export default function SDKDocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#0a0a0a] text-[#e2e8f0] overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
