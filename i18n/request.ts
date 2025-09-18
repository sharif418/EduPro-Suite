import {getRequestConfig} from 'next-intl/server';

const locales = ['en', 'bn', 'ar'];
 
export default getRequestConfig(async ({locale}) => {
  // Ensure that a valid locale is used
  if (!locale || !locales.includes(locale as any)) {
    locale = 'en';
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
