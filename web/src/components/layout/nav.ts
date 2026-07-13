import type { IconName } from '@/components/icon/Icon';

export type NavEntry = {
  to: string;
  labelKey: string;
  icon: IconName;
};

// Full navigation list, shown in the desktop sidebar and the mobile drawer.
export const NAV: NavEntry[] = [
  { to: '/dashboard', labelKey: 'Nav_dashboard', icon: 'dashboard' },
  { to: '/accounts', labelKey: 'Nav_accounts', icon: 'wallet' },
  { to: '/expenses', labelKey: 'Nav_expenses', icon: 'receipt' },
  { to: '/categories', labelKey: 'Nav_categories', icon: 'tag' },
  { to: '/recurring', labelKey: 'Nav_recurring', icon: 'refresh' },
  { to: '/loans', labelKey: 'Nav_loans', icon: 'library' },
];

// Primary destinations shown in the mobile bottom bar (the rest live behind "More").
export const BOTTOM_NAV: NavEntry[] = [
  { to: '/dashboard', labelKey: 'Nav_dashboard', icon: 'dashboard' },
  { to: '/accounts', labelKey: 'Nav_accounts', icon: 'wallet' },
  { to: '/expenses', labelKey: 'Nav_expenses', icon: 'receipt' },
  { to: '/loans', labelKey: 'Nav_loans', icon: 'library' },
];
