'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const sections = [
  {
    title: 'Getting Started',
    items: [
      { label: 'Introduction', href: '/docs/sdk' },
      { label: 'Installation', href: '/docs/sdk/installation' },
      { label: 'Quick Start', href: '/docs/sdk/quickstart' },
    ],
  },
  {
    title: 'API Reference',
    items: [
      { label: 'registerApp', href: '/docs/sdk/api/register-app' },
      { label: 'PluginContext', href: '/docs/sdk/api/plugin-context' },
      { label: 'AppManifest', href: '/docs/sdk/api/app-manifest' },
      { label: 'AppProps', href: '/docs/sdk/api/app-props' },
    ],
  },
  {
    title: 'Guides',
    items: [
      { label: 'Filesystem Access', href: '/docs/sdk/guides/filesystem' },
      { label: 'Context Layer', href: '/docs/sdk/guides/context-layer' },
      { label: 'Modals & Notifications', href: '/docs/sdk/guides/modals' },
      { label: 'Keyboard Shortcuts', href: '/docs/sdk/guides/shortcuts' },
    ],
  },
  {
    title: 'Advanced',
    items: [
      { label: 'Permissions', href: '/docs/sdk/advanced/permissions' },
      { label: 'Version Management', href: '/docs/sdk/advanced/versions' },
      { label: 'Publishing', href: '/docs/sdk/advanced/publishing' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-white/10 p-4 overflow-y-auto shrink-0">
      <Link href="/docs/sdk" className="block mb-6">
        <h1 className="text-lg font-bold bg-gradient-to-r from-[#00d4ff] to-[#7c3aed] bg-clip-text text-transparent">
          ContinuaOS SDK
        </h1>
        <p className="text-xs text-white/40 mt-0.5">v1.0.0</p>
      </Link>

      <nav className="space-y-6">
        {sections.map((section) => (
          <div key={section.title}>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-2 px-2">
              {section.title}
            </h3>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || (item.href === '/docs/sdk' && pathname === '/docs/sdk');
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'block px-3 py-1.5 text-sm rounded-md transition-colors',
                        isActive
                          ? 'bg-white/10 text-white'
                          : 'text-white/50 hover:text-white hover:bg-white/5'
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
