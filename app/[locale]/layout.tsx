import type { Metadata } from "next";
import { Hind_Siliguri, Almarai } from "next/font/google";
import "../globals.css";
import { SessionProvider } from "../components/SessionProvider";
import { ThemeProvider } from "../components/ThemeProvider";
import { ToastProvider } from "../contexts/ToastContext";
import { SettingsProvider } from "../contexts/SettingsContext";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { PageErrorBoundary } from '../components/ErrorBoundary';

// Bengali font
const hindSiliguri = Hind_Siliguri({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['bengali', 'latin'],
  variable: '--font-hind-siliguri',
  display: 'swap',
});

// Arabic font
const almarai = Almarai({
  weight: ['300', '400', '700', '800'],
  subsets: ['arabic'],
  variable: '--font-almarai',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "EduPro Suite - Educational Management System",
  description: "A comprehensive educational management platform for schools, teachers, students, and guardians.",
};

const locales = ['en', 'bn', 'ar'];

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = params;
  
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) notFound();

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages({ locale });

  // Determine text direction based on locale
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  // Determine font classes based on locale
  const getFontClasses = () => {
    switch (locale) {
      case 'bn':
        return `${hindSiliguri.variable} font-bengali`;
      case 'ar':
        return `${almarai.variable} font-arabic`;
      default:
        return 'font-sans';
    }
  };

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className={`${getFontClasses()} antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider defaultTheme="system">
            <SessionProvider>
              <SettingsProvider>
                <ToastProvider position="top-right" maxToasts={5}>
                  <PageErrorBoundary>
                    {children}
                  </PageErrorBoundary>
                </ToastProvider>
              </SettingsProvider>
            </SessionProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}
