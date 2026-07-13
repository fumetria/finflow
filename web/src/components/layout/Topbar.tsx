import { useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/icon/Icon';
import { Button } from '@/components/ui/button';
import { InputWithIcon } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// Maps a route path to the nav label key used in the breadcrumb.
const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Nav_dashboard',
  '/accounts': 'Nav_accounts',
  '/expenses': 'Nav_expenses',
};

// Available UI languages, shown as a compact segmented control.
const LANGUAGES = [
  { value: 'es', short: 'ES', labelKey: 'Topbar_lang_es' },
  { value: 'en', short: 'EN', labelKey: 'Topbar_lang_en' },
  { value: 'zh', short: '中', labelKey: 'Topbar_lang_zh' },
] as const;

export default function Topbar() {
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const titleKey = ROUTE_TITLES[pathname];
  const currentLang = i18n.language.split('-')[0];

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
        <div
          className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5"
          role="group"
          aria-label={t('Topbar_language')}
        >
          {LANGUAGES.map(({ value, short, labelKey }) => (
            <button
              key={value}
              onClick={() => void i18n.changeLanguage(value)}
              title={t(labelKey)}
              aria-pressed={currentLang === value}
              className={cn(
                'flex h-7 min-w-7 items-center justify-center rounded-md px-2 text-xs font-medium transition-colors',
                currentLang === value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {short}
            </button>
          ))}
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
