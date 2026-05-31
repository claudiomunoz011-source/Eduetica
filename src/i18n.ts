import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export const locales = ['es', 'de', 'fr', 'en'] as const;
export type Locale = typeof locales[number];
export const defaultLocale: Locale = 'es';

export default getRequestConfig(async () => {
  const cookieStore = cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE')?.value;
  const locale = (locales.includes(localeCookie as Locale) ? localeCookie : defaultLocale) as Locale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
