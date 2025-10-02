'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Globe, Check, ChevronDown } from 'lucide-react';

const languages = [
  { code: 'en', name: 'English', nativeName: 'English', abbr: 'EN' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', abbr: 'বাং' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', abbr: 'ع' }
];

export default function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  const currentLanguage = languages.find(lang => lang.code === locale) || languages[0];

  const handleLanguageChange = (langCode: string) => {
    setIsOpen(false);
    
    // Set the NEXT_LOCALE cookie to ensure persistence
    document.cookie = `NEXT_LOCALE=${langCode}; path=/; max-age=31536000; SameSite=Lax`;
    
    // Extract the current path without locale
    const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}/, '') || '/';
    
    // Create new path with selected locale (always include locale prefix)
    const newPath = `/${langCode}${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`;
    
    // Force a hard navigation to ensure proper locale switching
    window.location.href = newPath;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 border border-gray-200 dark:border-gray-700"
        aria-label="Change language"
        title={`Current language: ${currentLanguage.nativeName}`}
      >
        <Globe className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:block">
          {currentLanguage.abbr}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Select Language
            </p>
          </div>
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className={`w-full text-left px-3 py-2 text-sm transition-colors duration-200 flex items-center space-x-3 ${
                language.code === locale
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex-1">
                <div className="font-medium">{language.nativeName}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {language.name}
                </div>
              </div>
              {language.code === locale && (
                <Check className="w-4 h-4" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Close dropdown when clicking outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
