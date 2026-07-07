import { useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/icon/Icon';
import { Button } from '@/components/ui/button';
import { InputWithIcon } from '@/components/ui/input';

// Maps a route path to the nav label key used in the breadcrumb.
const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Nav_dashboard',
  '/accounts': 'Nav_accounts',
  '/expenses': 'Nav_expenses',
};

export default function Topbar() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const titleKey = ROUTE_TITLES[pathname];

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-7">
      <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <span>finflow</span>
        <Icon name="chevron-right" size={14} />
        <span className="font-medium text-foreground">
          {titleKey ? t(titleKey) : ''}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden w-64 md:block">
          <InputWithIcon
            icon={<Icon name="search" size={15} />}
            placeholder={t('Topbar_search')}
            className="h-8"
          />
        </div>
        <Button variant="ghost" size="icon" className="relative">
          <Icon name="notification" size={18} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-expense" />
        </Button>
        <Button variant="ghost" size="icon">
          <Icon name="cog" size={18} />
        </Button>
      </div>
    </header>
  );
}
