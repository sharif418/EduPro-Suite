import { useLocale } from 'next-intl';

// Locale-specific configurations
export const localeConfigs = {
  en: {
    dateFormat: 'MM/dd/yyyy',
    timeFormat: '12h',
    numberFormat: 'en-US',
    currency: 'USD',
    currencySymbol: '$',
    calendar: 'gregorian'
  },
  bn: {
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '12h',
    numberFormat: 'bn-BD',
    currency: 'BDT',
    currencySymbol: '৳',
    calendar: 'gregorian'
  },
  ar: {
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '12h',
    numberFormat: 'ar-SA',
    currency: 'SAR',
    currencySymbol: 'ر.س',
    calendar: 'islamic'
  }
} as const;

export type Locale = keyof typeof localeConfigs;

// Date formatting utilities
export function formatDate(date: Date, locale: Locale = 'en'): string {
  const config = localeConfigs[locale];
  
  return new Intl.DateTimeFormat(config.numberFormat, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function formatDateTime(date: Date, locale: Locale = 'en'): string {
  const config = localeConfigs[locale];
  
  return new Intl.DateTimeFormat(config.numberFormat, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: config.timeFormat === '12h'
  }).format(date);
}

export function formatTime(date: Date, locale: Locale = 'en'): string {
  const config = localeConfigs[locale];
  
  return new Intl.DateTimeFormat(config.numberFormat, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: config.timeFormat === '12h'
  }).format(date);
}

// Number formatting utilities
export function formatNumber(number: number, locale: Locale = 'en'): string {
  const config = localeConfigs[locale];
  
  return new Intl.NumberFormat(config.numberFormat).format(number);
}

export function formatCurrency(amount: number, locale: Locale = 'en'): string {
  const config = localeConfigs[locale];
  
  return new Intl.NumberFormat(config.numberFormat, {
    style: 'currency',
    currency: config.currency,
  }).format(amount);
}

export function formatPercentage(value: number, locale: Locale = 'en'): string {
  const config = localeConfigs[locale];
  
  return new Intl.NumberFormat(config.numberFormat, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

// Relative time formatting
export function formatRelativeTime(date: Date, locale: Locale = 'en'): string {
  const config = localeConfigs[locale];
  const rtf = new Intl.RelativeTimeFormat(config.numberFormat, { numeric: 'auto' });
  
  const now = new Date();
  const diffInSeconds = Math.floor((date.getTime() - now.getTime()) / 1000);
  
  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
    { label: 'second', seconds: 1 }
  ];
  
  for (const interval of intervals) {
    const count = Math.floor(Math.abs(diffInSeconds) / interval.seconds);
    if (count >= 1) {
      return rtf.format(diffInSeconds < 0 ? -count : count, interval.label as Intl.RelativeTimeFormatUnit);
    }
  }
  
  return rtf.format(0, 'second');
}

// Calendar utilities
export function getCalendarType(locale: Locale): string {
  return localeConfigs[locale].calendar;
}

// Islamic calendar utilities (for Arabic locale)
export function formatIslamicDate(date: Date): string {
  try {
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch (error) {
    // Fallback to Gregorian if Islamic calendar is not supported
    return formatDate(date, 'ar');
  }
}

// Bengali number conversion utilities
export function convertToBengaliNumbers(text: string): string {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return text.replace(/\d/g, (digit) => bengaliDigits[parseInt(digit)]);
}

export function convertToArabicNumbers(text: string): string {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return text.replace(/\d/g, (digit) => arabicDigits[parseInt(digit)]);
}

// Locale-aware number display
export function formatNumberForLocale(number: number, locale: Locale): string {
  const formatted = formatNumber(number, locale);
  
  switch (locale) {
    case 'bn':
      return convertToBengaliNumbers(formatted);
    case 'ar':
      return convertToArabicNumbers(formatted);
    default:
      return formatted;
  }
}

// React hooks for cultural formatting
export function useCulturalFormatting() {
  const locale = useLocale() as Locale;
  
  return {
    formatDate: (date: Date) => formatDate(date, locale),
    formatDateTime: (date: Date) => formatDateTime(date, locale),
    formatTime: (date: Date) => formatTime(date, locale),
    formatNumber: (number: number) => formatNumberForLocale(number, locale),
    formatCurrency: (amount: number) => formatCurrency(amount, locale),
    formatPercentage: (value: number) => formatPercentage(value, locale),
    formatRelativeTime: (date: Date) => formatRelativeTime(date, locale),
    locale,
    config: localeConfigs[locale]
  };
}
