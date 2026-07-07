import { NavLink, useNavigate, Link } from 'react-router';
import { useTranslation } from 'react-i18next';

import { Icon, type IconName } from '@/components/icon/Icon';
import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '@/features/theme/ThemeContext';
import { cn } from '@/lib/utils';

type NavEntry = {
  to: string;
  labelKey: string;
  icon: IconName;
};

const NAV: NavEntry[] = [
  { to: '/dashboard', labelKey: 'Nav_dashboard', icon: 'dashboard' },
  { to: '/accounts', labelKey: 'Nav_accounts', icon: 'wallet' },
  { to: '/expenses', labelKey: 'Nav_expenses', icon: 'receipt' },
  { to: '/categories', labelKey: 'Nav_categories', icon: 'tag' },
  { to: '/recurring', labelKey: 'Nav_recurring', icon: 'refresh' },
  { to: '/loans', labelKey: 'Nav_loans', icon: 'library' },
];

function NavItem({ entry }: { entry: NavEntry }) {
  const { t } = useTranslation();
  return (
    <NavLink
      to={entry.to}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-muted text-foreground'
            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 h-5 w-[3px] rounded-r-full bg-brand" />
          )}
          <Icon
            name={entry.icon}
            size={18}
            className={isActive ? 'text-brand' : ''}
          />
          {t(entry.labelKey)}
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const email = user?.email ?? '';
  const initials = email.slice(0, 2).toUpperCase() || '··';

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <aside className="flex w-[244px] shrink-0 flex-col border-r border-border bg-card/40">
      <div className="flex h-14 items-center gap-2.5 px-5">
        <BrandMark size={28} />
        <span className="text-base font-semibold tracking-tight">finflow</span>
      </div>

      <div className="px-3 pt-2">
        <Button asChild className="w-full justify-start">
          <Link to="/expenses?new=1">
            <Icon name="add" size={16} />
            {t('Nav_new_expense')}
          </Link>
        </Button>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 pt-4">
        <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {t('Nav_section_general')}
        </p>
        {NAV.map((entry) => (
          <NavItem key={entry.to} entry={entry} />
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          {(
            [
              { value: 'light', icon: 'light', labelKey: 'Topbar_theme_light' },
              { value: 'dark', icon: 'moon', labelKey: 'Topbar_theme_dark' },
              { value: 'system', icon: 'monitor', labelKey: 'Topbar_theme_system' },
            ] as const
          ).map(({ value, icon, labelKey }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              title={t(labelKey)}
              className={cn(
                'flex flex-1 items-center justify-center rounded-md py-1 transition-colors',
                theme === value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon name={icon} size={15} />
            </button>
          ))}
        </div>

        <Separator className="my-2" />

        <div className="flex items-center gap-2.5 rounded-lg p-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium">{email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title={t('Sidebar_logout')}
          >
            <Icon name="door-exit" size={17} />
          </button>
        </div>
      </div>
    </aside>
  );
}
