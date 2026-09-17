export type Locale = 'ko' | 'en';

export function parseLocale(value: string | null | undefined): Locale {
  return value === 'en' ? 'en' : 'ko';
}

export function tourismConfig(locale: Locale) {
  return locale === 'en'
    ? { service: 'EngService2', attraction: '76', accommodation: '80' }
    : { service: 'KorService2', attraction: '12', accommodation: '32' };
}
