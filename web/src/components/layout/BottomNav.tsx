import { NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/icon/Icon';
import { cn } from '@/lib/utils';
import { BOTTOM_NAV } from './nav';

const itemClass =
  'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 py-1.5 text-[10px] font-medium transition-colors';

// Fixed bottom tab bar, mobile only. The full nav (categories, theme, logout)
// lives in the drawer opened from the Topbar hamburger.
export default function BottomNav() {
  const { t } = useTranslation();

  return (
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
              isActive ? 'text-brand' : 'text-muted-foreground hover:text-foreground',
            )
          }
        >
          <Icon name={entry.icon} size={20} />
          <span className="max-w-full truncate">{t(entry.labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
