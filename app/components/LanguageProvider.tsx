'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Locale } from '../lib/locale';
import { translate } from '../lib/translations';

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (text: string, values?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ initialLocale, children }: { initialLocale: Locale; children: ReactNode }) {
  const [locale, updateLocale] = useState(initialLocale);
  const value = useMemo<LanguageContextValue>(() => ({
    locale,
    setLocale(next) {
      updateLocale(next);
      document.documentElement.lang = next;
      document.cookie = `celeb-map-language=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    },
    t: (text, values) => translate(locale, text, values),
  }), [locale]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('LanguageProvider is required.');
  return value;
}

export function LanguageToggle() {
  const { locale, setLocale } = useLanguage();
  return (
    <div role="group" aria-label="한국어 / English" className="inline-flex shrink-0 items-center rounded-full bg-plum-50 p-0.5 ring-1 ring-inset ring-plum-100">
      {(['ko', 'en'] as const).map(language => (
        <button key={language} type="button" lang={language} aria-label={language === 'ko' ? '한국어' : 'English'} title={language === 'ko' ? '한국어' : 'English'} aria-pressed={locale === language}
          onClick={() => setLocale(language)}
          className={`flex h-10 w-11 items-center justify-center rounded-full text-[11px] font-bold tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-700 ${locale === language ? 'bg-white text-plum-900 shadow-sm' : 'text-plum-400 hover:text-plum-700'}`}>
          {language === 'ko' ? 'KO' : 'EN'}
        </button>
      ))}
    </div>
  );
}
