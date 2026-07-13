import { useState } from 'react';
import { NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/icon/Icon';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { BOTTOM_NAV } from './nav';
import { SidebarContent } from './Sidebar';

const itemClass =
  'flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium transition-colors';

// Fixed bottom tab bar, mobile only. Shows the primary destinations plus a
// "More" button that opens the full sidebar drawer (nav + theme + logout).
export default function BottomNav() {
  const { t } = useTranslation();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background/95 backdrop-blur md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {BOTTOM_NAV.map((entry) => (
          <NavLink
            key={entry.to}
            to={entry.to}
            className={({ isActive }) =>
              cn(
                itemClass,
                isActive
                  ? 'text-brand'
                  : 'text-muted-foreground hover:text-foreground',
              )
            }
          >
            <Icon name={entry.icon} size={20} />
            {t(entry.labelKey)}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={cn(itemClass, 'text-muted-foreground hover:text-foreground')}
        >
          <Icon name="menu" size={20} />
          {t('Nav_more')}
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="left" aria-describedby={undefined}>
          <SheetTitle className="sr-only">{t('Nav_menu')}</SheetTitle>
          <SidebarContent onNavigate={() => setMoreOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
