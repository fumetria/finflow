import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// Returns a stable formatter that renders an amount (string, from a numeric
// column) as currency in the active locale.
export function useCurrencyFormatter() {
  const { i18n } = useTranslation();
  return useCallback(
    (amount: string, currency: string) =>
      new Intl.NumberFormat(i18n.language, { style: 'currency', currency }).format(Number(amount)),
    [i18n.language],
  );
}
