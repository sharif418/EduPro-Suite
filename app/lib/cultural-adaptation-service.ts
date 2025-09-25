export interface BengaliNumberConfig {
  useBengaliNumerals: boolean;
  useIndianNumberSystem: boolean;
  currencySymbol: string;
  currencyFormat: 'prefix' | 'suffix';
}

export interface IslamicThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  patternOpacity: number;
  useIslamicPatterns: boolean;
  useIslamicCalendar: boolean;
}

export interface CulturalSettings {
  language: 'bn' | 'en' | 'ar';
  region: 'BD' | 'IN' | 'PK' | 'SA';
  calendar: 'gregorian' | 'islamic' | 'bengali';
  numberSystem: 'western' | 'bengali' | 'arabic';
  currency: 'BDT' | 'USD' | 'SAR';
  timeFormat: '12h' | '24h';
  dateFormat: 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd';
  weekStart: 'sunday' | 'monday' | 'friday';
}

export class CulturalAdaptationService {
  
  /**
   * Convert Western numerals to Bengali numerals
   */
  static convertToBengaliNumerals(number: string | number): string {
    const bengaliNumerals = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    const westernNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    
    let result = number.toString();
    
    for (let i = 0; i < westernNumerals.length; i++) {
      result = result.replace(new RegExp(westernNumerals[i], 'g'), bengaliNumerals[i]);
    }
    
    return result;
  }

  /**
   * Convert Bengali numerals to Western numerals
   */
  static convertToWesternNumerals(bengaliNumber: string): string {
    const bengaliNumerals = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    const westernNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    
    let result = bengaliNumber;
    
    for (let i = 0; i < bengaliNumerals.length; i++) {
      result = result.replace(new RegExp(bengaliNumerals[i], 'g'), westernNumerals[i]);
    }
    
    return result;
  }

  /**
   * Format currency according to Bengali conventions
   */
  static formatBengaliCurrency(amount: number, options: {
    useBengaliNumerals?: boolean;
    useCommas?: boolean;
    showSymbol?: boolean;
  } = {}): string {
    const {
      useBengaliNumerals = true,
      useCommas = true,
      showSymbol = true
    } = options;

    // Format with commas in Indian number system (lakhs, crores)
    let formatted = '';
    
    if (amount >= 10000000) { // 1 crore
      const crores = Math.floor(amount / 10000000);
      const remainder = amount % 10000000;
      const lakhs = Math.floor(remainder / 100000);
      
      formatted = `${crores},${lakhs.toString().padStart(2, '0')},00,000`;
      if (remainder % 100000 > 0) {
        const thousands = Math.floor((remainder % 100000) / 1000);
        const hundreds = remainder % 1000;
        formatted = `${crores},${lakhs.toString().padStart(2, '0')},${thousands.toString().padStart(2, '0')},${hundreds.toString().padStart(3, '0')}`;
      }
    } else if (amount >= 100000) { // 1 lakh
      const lakhs = Math.floor(amount / 100000);
      const remainder = amount % 100000;
      const thousands = Math.floor(remainder / 1000);
      const hundreds = remainder % 1000;
      
      formatted = `${lakhs},${thousands.toString().padStart(2, '0')},${hundreds.toString().padStart(3, '0')}`;
    } else if (amount >= 1000) {
      const thousands = Math.floor(amount / 1000);
      const hundreds = amount % 1000;
      formatted = `${thousands},${hundreds.toString().padStart(3, '0')}`;
    } else {
      formatted = amount.toString();
    }

    // Convert to Bengali numerals if requested
    if (useBengaliNumerals) {
      formatted = this.convertToBengaliNumerals(formatted);
    }

    // Add currency symbol
    if (showSymbol) {
      formatted = `৳${formatted}`;
    }

    return formatted;
  }

  /**
   * Get Islamic geometric patterns
   */
  static getIslamicPatterns(): Array<{
    id: string;
    name: string;
    arabicName: string;
    bengaliName: string;
    svgPath: string;
    description: string;
    category: 'geometric' | 'floral' | 'calligraphic';
  }> {
    return [
      {
        id: 'octagonal_star',
        name: 'Octagonal Star',
        arabicName: 'النجمة الثمانية',
        bengaliName: 'অষ্টভুজাকার তারা',
        svgPath: 'M50,10 L70,30 L90,30 L90,50 L70,70 L50,90 L30,70 L10,50 L10,30 L30,30 Z',
        description: 'Traditional Islamic octagonal star pattern',
        category: 'geometric'
      },
      {
        id: 'arabesque',
        name: 'Arabesque',
        arabicName: 'الأرابيسك',
        bengaliName: 'আরবেস্ক',
        svgPath: 'M10,50 Q30,10 50,50 Q70,90 90,50 Q70,10 50,50 Q30,90 10,50',
        description: 'Flowing arabesque pattern',
        category: 'floral'
      },
      {
        id: 'geometric_tile',
        name: 'Geometric Tile',
        arabicName: 'البلاط الهندسي',
        bengaliName: 'জ্যামিতিক টাইল',
        svgPath: 'M0,0 L20,0 L30,10 L30,30 L20,40 L0,40 L-10,30 L-10,10 Z',
        description: 'Traditional geometric tile pattern',
        category: 'geometric'
      }
    ];
  }

  /**
   * Get culturally appropriate color schemes
   */
  static getIslamicColorSchemes(): Array<{
    id: string;
    name: string;
    arabicName: string;
    bengaliName: string;
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      text: string;
    };
    description: string;
  }> {
    return [
      {
        id: 'emerald_gold',
        name: 'Emerald & Gold',
        arabicName: 'الزمرد والذهب',
        bengaliName: 'পান্না ও সোনা',
        colors: {
          primary: '#059669', // Emerald
          secondary: '#F59E0B', // Gold
          accent: '#DC2626', // Red
          background: '#F0FDF4', // Light green
          text: '#064E3B' // Dark green
        },
        description: 'Traditional Islamic colors representing nature and prosperity'
      },
      {
        id: 'sapphire_silver',
        name: 'Sapphire & Silver',
        arabicName: 'الياقوت والفضة',
        bengaliName: 'নীলকান্ত ও রূপা',
        colors: {
          primary: '#1E40AF', // Blue
          secondary: '#6B7280', // Silver
          accent: '#7C3AED', // Purple
          background: '#EFF6FF', // Light blue
          text: '#1E3A8A' // Dark blue
        },
        description: 'Calming colors inspired by Islamic architecture'
      },
      {
        id: 'burgundy_cream',
        name: 'Burgundy & Cream',
        arabicName: 'العنابي والكريم',
        bengaliName: 'বারগান্ডি ও ক্রিম',
        colors: {
          primary: '#991B1B', // Burgundy
          secondary: '#FEF3C7', // Cream
          accent: '#92400E', // Brown
          background: '#FFFBEB', // Light cream
          text: '#7C2D12' // Dark brown
        },
        description: 'Warm and elegant colors for formal settings'
      }
    ];
  }

  /**
   * Get Islamic greeting templates
   */
  static getIslamicGreetings(): Array<{
    occasion: string;
    arabic: string;
    bengali: string;
    english: string;
    transliteration: string;
  }> {
    return [
      {
        occasion: 'general',
        arabic: 'السلام عليكم ورحمة الله وبركاته',
        bengali: 'আসসালামু আলাইকুম ওয়া রাহমাতুল্লাহি ওয়া বারাকাতুহু',
        english: 'Peace be upon you and God\'s mercy and blessings',
        transliteration: 'Assalamu Alaikum wa Rahmatullahi wa Barakatuh'
      },
      {
        occasion: 'morning',
        arabic: 'صباح الخير، بارك الله في يومكم',
        bengali: 'সুপ্রভাত, আল্লাহ আপনার দিনে বরকত দিন',
        english: 'Good morning, may Allah bless your day',
        transliteration: 'Sabah al-khayr, barak Allah fi yawmikum'
      },
      {
        occasion: 'ramadan',
        arabic: 'رمضان مبارك، تقبل الله منا ومنكم',
        bengali: 'রমজান মুবারক, আল্লাহ আমাদের ও আপনাদের থেকে কবুল করুন',
        english: 'Blessed Ramadan, may Allah accept from us and you',
        transliteration: 'Ramadan Mubarak, taqabbal Allah minna wa minkum'
      },
      {
        occasion: 'eid',
        arabic: 'عيد مبارك، كل عام وأنتم بخير',
        bengali: 'ঈদ মুবারক, আপনারা সবাই ভালো থাকুন',
        english: 'Blessed Eid, may you all be well',
        transliteration: 'Eid Mubarak, kull aam wa antum bi-khayr'
      }
    ];
  }

  /**
   * Get Islamic academic calendar events
   */
  static getIslamicAcademicCalendar(year: number): Array<{
    date: Date;
    name: string;
    arabicName: string;
    bengaliName: string;
    type: 'religious' | 'academic' | 'cultural';
    isHoliday: boolean;
    description: string;
  }> {
    // Note: These are approximate dates and should be calculated using proper Islamic calendar
    return [
      {
        date: new Date(year, 0, 1),
        name: 'New Year',
        arabicName: 'رأس السنة الميلادية',
        bengaliName: 'নববর্ষ',
        type: 'cultural',
        isHoliday: true,
        description: 'Gregorian New Year celebration'
      },
      {
        date: new Date(year, 1, 21),
        name: 'International Mother Language Day',
        arabicName: 'اليوم العالمي للغة الأم',
        bengaliName: 'আন্তর্জাতিক মাতৃভাষা দিবস',
        type: 'cultural',
        isHoliday: true,
        description: 'Commemorating the language movement of Bangladesh'
      },
      {
        date: new Date(year, 2, 26),
        name: 'Independence Day',
        arabicName: 'يوم الاستقلال',
        bengaliName: 'স্বাধীনতা দিবস',
        type: 'cultural',
        isHoliday: true,
        description: 'Bangladesh Independence Day'
      },
      {
        date: new Date(year, 3, 14),
        name: 'Bengali New Year',
        arabicName: 'السنة البنغالية الجديدة',
        bengaliName: 'পহেলা বৈশাখ',
        type: 'cultural',
        isHoliday: true,
        description: 'Traditional Bengali New Year celebration'
      }
    ];
  }

  /**
   * Format date according to cultural preferences
   */
  static formatDate(date: Date, settings: CulturalSettings): string {
    const locale = settings.language === 'bn' ? 'bn-BD' : 
                   settings.language === 'ar' ? 'ar-SA' : 'en-US';

    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };

    if (settings.calendar === 'islamic') {
      options.calendar = 'islamic';
    } else if (settings.calendar === 'bengali') {
      // Custom Bengali calendar formatting would go here
      return this.formatBengaliDate(date);
    }

    let formatted = date.toLocaleDateString(locale, options);

    // Convert numerals if needed
    if (settings.numberSystem === 'bengali') {
      formatted = this.convertToBengaliNumerals(formatted);
    }

    return formatted;
  }

  /**
   * Format time according to cultural preferences
   */
  static formatTime(date: Date, settings: CulturalSettings): string {
    const locale = settings.language === 'bn' ? 'bn-BD' : 
                   settings.language === 'ar' ? 'ar-SA' : 'en-US';

    const options: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: settings.timeFormat === '12h'
    };

    let formatted = date.toLocaleTimeString(locale, options);

    // Convert numerals if needed
    if (settings.numberSystem === 'bengali') {
      formatted = this.convertToBengaliNumerals(formatted);
    }

    return formatted;
  }

  /**
   * Format Bengali date (custom implementation)
   */
  private static formatBengaliDate(date: Date): string {
    const bengaliMonths = [
      'বৈশাখ', 'জ্যৈষ্ঠ', 'আষাঢ়', 'শ্রাবণ', 'ভাদ্র', 'আশ্বিন',
      'কার্তিক', 'অগ্রহায়ণ', 'পৌষ', 'মাঘ', 'ফাল্গুন', 'চৈত্র'
    ];

    // Simplified Bengali calendar conversion (approximate)
    const gregorianYear = date.getFullYear();
    const gregorianMonth = date.getMonth();
    const gregorianDay = date.getDate();

    // Bengali year starts from April 14th (approximately)
    let bengaliYear = gregorianYear - 593;
    let bengaliMonth = (gregorianMonth + 9) % 12;
    
    if (gregorianMonth >= 3 && gregorianDay >= 14) {
      bengaliYear++;
    }

    const bengaliDay = this.convertToBengaliNumerals(gregorianDay.toString());
    const bengaliYearStr = this.convertToBengaliNumerals(bengaliYear.toString());

    return `${bengaliDay} ${bengaliMonths[bengaliMonth]} ${bengaliYearStr}`;
  }

  /**
   * Get prayer time formatted messages
   */
  static getPrayerTimeMessages(language: 'bn' | 'en' | 'ar'): {
    [key: string]: string;
  } {
    const messages = {
      'bn': {
        'fajr': 'ফজরের নামাজের সময় হয়েছে',
        'dhuhr': 'জোহরের নামাজের সময় হয়েছে',
        'asr': 'আসরের নামাজের সময় হয়েছে',
        'maghrib': 'মাগরিবের নামাজের সময় হয়েছে',
        'isha': 'এশার নামাজের সময় হয়েছে',
        'reminder': 'নামাজের সময় স্মরণ করিয়ে দেওয়া হচ্ছে'
      },
      'en': {
        'fajr': 'It\'s time for Fajr prayer',
        'dhuhr': 'It\'s time for Dhuhr prayer',
        'asr': 'It\'s time for Asr prayer',
        'maghrib': 'It\'s time for Maghrib prayer',
        'isha': 'It\'s time for Isha prayer',
        'reminder': 'Prayer time reminder'
      },
      'ar': {
        'fajr': 'حان وقت صلاة الفجر',
        'dhuhr': 'حان وقت صلاة الظهر',
        'asr': 'حان وقت صلاة العصر',
        'maghrib': 'حان وقت صلاة المغرب',
        'isha': 'حان وقت صلاة العشاء',
        'reminder': 'تذكير بوقت الصلاة'
      }
    };

    return messages[language];
  }

  /**
   * Get culturally appropriate success/error messages
   */
  static getStatusMessages(language: 'bn' | 'en' | 'ar'): {
    success: string[];
    error: string[];
    warning: string[];
    info: string[];
  } {
    const messages = {
      'bn': {
        success: [
          'আলহামদুলিল্লাহ! সফলভাবে সম্পন্ন হয়েছে।',
          'মাশাআল্লাহ! কাজটি সম্পূর্ণ হয়েছে।',
          'বারাকাল্লাহু ফিকুম! সফল হয়েছে।'
        ],
        error: [
          'ইন্না লিল্লাহি ওয়া ইন্না ইলাইহি রাজিউন। একটি সমস্যা হয়েছে।',
          'দুঃখিত, কিছু ভুল হয়েছে।',
          'অনুগ্রহ করে আবার চেষ্টা করুন।'
        ],
        warning: [
          'সাবধান! এই কাজটি সম্পন্ন করার আগে নিশ্চিত হন।',
          'দয়া করে সতর্ক থাকুন।'
        ],
        info: [
          'তথ্যের জন্য জানানো হচ্ছে।',
          'অনুগ্রহ করে লক্ষ্য করুন।'
        ]
      },
      'en': {
        success: [
          'Alhamdulillah! Successfully completed.',
          'MashaAllah! Task completed.',
          'BarakAllahu feekum! Success.'
        ],
        error: [
          'Inna lillahi wa inna ilayhi raji\'un. An error occurred.',
          'Sorry, something went wrong.',
          'Please try again.'
        ],
        warning: [
          'Warning! Please confirm before proceeding.',
          'Please be careful.'
        ],
        info: [
          'For your information.',
          'Please note.'
        ]
      },
      'ar': {
        success: [
          'الحمد لله! تم بنجاح.',
          'ماشاء الله! اكتملت المهمة.',
          'بارك الله فيكم! نجح.'
        ],
        error: [
          'إنا لله وإنا إليه راجعون. حدث خطأ.',
          'عذراً، حدث خطأ ما.',
          'يرجى المحاولة مرة أخرى.'
        ],
        warning: [
          'تحذير! يرجى التأكيد قبل المتابعة.',
          'يرجى توخي الحذر.'
        ],
        info: [
          'للعلم.',
          'يرجى الملاحظة.'
        ]
      }
    };

    return messages[language];
  }

  /**
   * Get Islamic educational terms
   */
  static getIslamicEducationalTerms(language: 'bn' | 'en' | 'ar'): {
    [key: string]: string;
  } {
    const terms = {
      'bn': {
        'student': 'ছাত্র/ছাত্রী',
        'teacher': 'উস্তাদ/উস্তাজা',
        'principal': 'মুহতামিম',
        'class': 'দরস',
        'lesson': 'পাঠ',
        'exam': 'ইমতিহান',
        'grade': 'দরজা',
        'attendance': 'হাজিরা',
        'homework': 'বাড়ির কাজ',
        'library': 'কুতুবখানা',
        'mosque': 'মসজিদ',
        'prayer': 'নামাজ',
        'quran': 'কুরআন',
        'hadith': 'হাদিস',
        'fiqh': 'ফিকহ',
        'akhlaq': 'আখলাক'
      },
      'en': {
        'student': 'Student',
        'teacher': 'Ustaz/Ustaza',
        'principal': 'Muhtamim',
        'class': 'Dars',
        'lesson': 'Lesson',
        'exam': 'Imtihan',
        'grade': 'Grade',
        'attendance': 'Attendance',
        'homework': 'Homework',
        'library': 'Kutubkhana',
        'mosque': 'Mosque',
        'prayer': 'Salah',
        'quran': 'Quran',
        'hadith': 'Hadith',
        'fiqh': 'Fiqh',
        'akhlaq': 'Akhlaq'
      },
      'ar': {
        'student': 'طالب/طالبة',
        'teacher': 'أستاذ/أستاذة',
        'principal': 'مهتمم',
        'class': 'درس',
        'lesson': 'درس',
        'exam': 'امتحان',
        'grade': 'درجة',
        'attendance': 'حضور',
        'homework': 'واجب منزلي',
        'library': 'كتبخانة',
        'mosque': 'مسجد',
        'prayer': 'صلاة',
        'quran': 'قرآن',
        'hadith': 'حديث',
        'fiqh': 'فقه',
        'akhlaq': 'أخلاق'
      }
    };

    return terms[language];
  }

  /**
   * Apply cultural adaptations to UI text
   */
  static adaptUIText(text: string, settings: CulturalSettings): string {
    let adaptedText = text;

    // Apply number system conversion
    if (settings.numberSystem === 'bengali') {
      adaptedText = this.convertToBengaliNumerals(adaptedText);
    }

    // Apply Islamic greetings where appropriate
    if (text.toLowerCase().includes('welcome') || text.toLowerCase().includes('hello')) {
      const greetings = this.getIslamicGreetings();
      const greeting = greetings.find(g => g.occasion === 'general');
      if (greeting) {
        const greetingText = settings.language === 'bn' ? greeting.bengali :
                            settings.language === 'ar' ? greeting.arabic : greeting.english;
        adaptedText = `${greetingText} - ${adaptedText}`;
      }
    }

    return adaptedText;
  }

  /**
   * Get default cultural settings for Bangladesh
   */
  static getDefaultBangladeshSettings(): CulturalSettings {
    return {
      language: 'bn',
      region: 'BD',
      calendar: 'gregorian',
      numberSystem: 'bengali',
      currency: 'BDT',
      timeFormat: '12h',
      dateFormat: 'dd/mm/yyyy',
      weekStart: 'sunday'
    };
  }

  /**
   * Validate cultural settings
   */
  static validateSettings(settings: Partial<CulturalSettings>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (settings.language && !['bn', 'en', 'ar'].includes(settings.language)) {
      errors.push('Invalid language. Must be bn, en, or ar');
    }

    if (settings.region && !['BD', 'IN', 'PK', 'SA'].includes(settings.region)) {
      errors.push('Invalid region. Must be BD, IN, PK, or SA');
    }

    if (settings.calendar && !['gregorian', 'islamic', 'bengali'].includes(settings.calendar)) {
      errors.push('Invalid calendar. Must be gregorian, islamic, or bengali');
    }

    if (settings.numberSystem && !['western', 'bengali', 'arabic'].includes(settings.numberSystem)) {
      errors.push('Invalid number system. Must be western, bengali, or arabic');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
