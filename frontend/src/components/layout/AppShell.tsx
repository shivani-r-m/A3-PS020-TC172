import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function AppShell() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-ink-950">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="lg:pl-60">
        <TopBar onMenu={() => setNavOpen(true)} />
        <main className="mx-auto max-w-[1400px] px-4 py-5 lg:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
