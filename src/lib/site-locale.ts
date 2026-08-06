import { cookies } from 'next/headers';
import en from '@/dictionaries/en.json';
import ar from '@/dictionaries/ar.json';

export type SiteLocale = {
  lang: 'en' | 'ar';
  dir: 'ltr' | 'rtl';
  dictionary: Record<string, string>;
};

const SITE_LANG_COOKIE = 'el-prince-lang-site';

export async function getSiteLocale(): Promise<SiteLocale> {
  const store = await cookies();
  const lang = store.get(SITE_LANG_COOKIE)?.value === 'ar' ? 'ar' : 'en';
  return {
    lang,
    dir: lang === 'ar' ? 'rtl' : 'ltr',
    dictionary: lang === 'ar' ? ar : en,
  };
}
