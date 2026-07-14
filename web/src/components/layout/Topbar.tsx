import { useState } from 'react';
import { useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { DropdownMenu } from 'radix-ui';

import { Icon } from '@/components/icon/Icon';
import { Button } from '@/components/ui/button';
import { InputWithIcon } from '@/components/ui/input';

// Maps a route path to the nav label key used in the breadcrumb.
const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Nav_dashboard',
  '/accounts': 'Nav_accounts',
  '/expenses': 'Nav_expenses',
  '/categories': 'Nav_categories',
  '/recurring': 'Nav_recurring',
  '/loans': 'Nav_loans',
};

// localStorage key i18next-browser-languagedetector caches the choice under.
const LNG_STORAGE_KEY = 'i18nextLng';

// Concrete UI languages (excludes the "system" pseudo-option).
const SUPPORTED_LANGUAGES = ['es', 'en', 'zh'] as const;

// Dropdown options; "system" follows the browser/OS language.
const LANGUAGE_OPTIONS = [
  { value: 'system', labelKey: 'Topbar_lang_system' },
  { value: 'es', labelKey: 'Topbar_lang_es' },
  { value: 'en', labelKey: 'Topbar_lang_en' },
  { value: 'zh', labelKey: 'Topbar_lang_zh' },
] as const;

// Best browser/OS language among the ones we support, falling back to es.
function detectSystemLanguage(): string {
  const candidates = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];
  for (const lang of candidates) {
    const base = lang.split('-')[0] ?? lang;
    if ((SUPPORTED_LANGUAGES as readonly string[]).includes(base)) return base;
  }
  return 'es';
}

export default function Topbar({ onOpenNav }: { onOpenNav?: () => void }) {
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const titleKey = ROUTE_TITLES[pathname];

  // 'system' when no explicit choice is stored, otherwise the stored language.
  const [langMode, setLangMode] = useState<string>(() =>
    localStorage.getItem(LNG_STORAGE_KEY)?.split('-')[0] ?? 'system',
  );

  function selectLanguage(value: string) {
    setLangMode(value);
    if (value === 'system') {
      // Drop the stored preference and re-detect; strip the value the detector
      // re-caches on change so the app keeps following the system language.
      localStorage.removeItem(LNG_STORAGE_KEY);
      void i18n
        .changeLanguage(detectSystemLanguage())
        .then(() => localStorage.removeItem(LNG_STORAGE_KEY));
    } else {
      void i18n.changeLanguage(value);
    }
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 md:px-7">
      <div className="flex min-w-0 items-center gap-2 text-[13px] text-muted-foreground">
        <Button
          variant="ghost"
          size="icon"
          className="-ml-1 md:hidden"
          aria-label={t('Nav_menu')}
          onClick={onOpenNav}
        >
          <Icon name="menu" size={20} />
        </Button>
        <span className="hidden sm:inline">finflow</span>
        <Icon name="chevron-right" size={14} className="hidden sm:inline" />
        <span className="truncate font-medium text-foreground">
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
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button variant="ghost" size="icon" aria-label={t('Topbar_language')}>
              <Icon name="translate" size={18} />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              className="z-50 min-w-40 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md"
            >
              {LANGUAGE_OPTIONS.map(({ value, labelKey }) => (
                <DropdownMenu.Item
                  key={value}
                  onSelect={() => selectLanguage(value)}
                  className="flex cursor-pointer select-none items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-sm outline-none transition-colors data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                >
                  {t(labelKey)}
                  {langMode === value && (
                    <Icon name="check" size={15} className="text-brand" />
                  )}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

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
