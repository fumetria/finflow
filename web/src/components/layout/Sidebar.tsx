import { NavLink, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  DashboardSquare01Icon,
  Wallet01Icon,
  ReceiptTextIcon,
  RepeatIcon,
  BankIcon,
  PlusSignIcon,
  Sun01Icon,
  Moon02Icon,
  Logout01Icon,
} from '@hugeicons/core-free-icons';

import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '@/features/theme/ThemeContext';
import { cn } from '@/lib/utils';

type NavEntry = {
  to: string;
  labelKey: string;
  icon: typeof DashboardSquare01Icon;
};

const NAV: NavEntry[] = [
  { to: '/dashboard', labelKey: 'Nav_dashboard', icon: DashboardSquare01Icon },
  { to: '/accounts', labelKey: 'Nav_accounts', icon: Wallet01Icon },
  { to: '/expenses', labelKey: 'Nav_expenses', icon: ReceiptTextIcon },
];

const NAV_SOON: NavEntry[] = [
  { to: '/recurring', labelKey: 'Nav_recurring', icon: RepeatIcon },
  { to: '/loans', labelKey: 'Nav_loans', icon: BankIcon },
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
          <HugeiconsIcon
            icon={entry.icon}
            size={18}
            className={isActive ? 'text-brand' : ''}
          />
          {t(entry.labelKey)}
        </>
      )}
    </NavLink>
  );
}

function NavItemSoon({ entry }: { entry: NavEntry }) {
  const { t } = useTranslation();
  return (
    <span className="group relative flex cursor-default items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground/60">
      <HugeiconsIcon icon={entry.icon} size={18} />
      {t(entry.labelKey)}
      <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
        {t('Nav_soon_badge')}
      </span>
    </span>
  );
}

export default function Sidebar() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
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
        {/* TODO: open the "new expense" modal once ExpenseForm exists (later phase). */}
        <Button className="w-full justify-start" onClick={() => {}}>
          <HugeiconsIcon icon={PlusSignIcon} size={16} />
          {t('Nav_new_expense')}
        </Button>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 pt-4">
        <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {t('Nav_section_general')}
        </p>
        {NAV.map((entry) => (
          <NavItem key={entry.to} entry={entry} />
        ))}

        <p className="px-3 pb-1 pt-4 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {t('Nav_section_soon')}
        </p>
        {NAV_SOON.map((entry) => (
          <NavItemSoon key={entry.to} entry={entry} />
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
          <button
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title={t(isDark ? 'Topbar_theme_dark' : 'Topbar_theme_light')}
          >
            <HugeiconsIcon icon={isDark ? Moon02Icon : Sun01Icon} size={17} />
          </button>
          <span className="text-xs text-muted-foreground">
            {t(isDark ? 'Topbar_theme_dark' : 'Topbar_theme_light')}
          </span>
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
            <HugeiconsIcon icon={Logout01Icon} size={17} />
          </button>
        </div>
      </div>
    </aside>
  );
}
