import { useState } from 'react';
import { Outlet } from 'react-router';

import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useTranslation } from 'react-i18next';
import Sidebar, { SidebarContent } from './Sidebar';
import Topbar from './Topbar';
import BottomNav from './BottomNav';

export default function AppLayout() {
  const { t } = useTranslation();
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenNav={() => setNavOpen(true)} />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile drawer opened from the Topbar hamburger. */}
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" aria-describedby={undefined}>
          <SheetTitle className="sr-only">{t('Nav_menu')}</SheetTitle>
          <SidebarContent onNavigate={() => setNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <BottomNav />
    </div>
  );
}
