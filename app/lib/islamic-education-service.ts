import { prisma } from './prisma';
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';

export interface QuranSurah {
  id: string;
  surahNumber: number;
  arabicName: string;
  englishName: string;
  bengaliName: string;
  totalAyahs: number;
  revelationType: 'Meccan' | 'Medinan';
  description?: string;
}

export interface HifzProgress {
  id: string;
  studentId: string;
  studentName: string;
  surahId: string;
  surahName: string;
  startAyah: number;
  endAyah: number;
  memorizedAyahs: number;
  reviewCount: number;
  lastReviewDate?: Date;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'NEEDS_REVIEW';
  teacherId?: string;
  teacherName?: string;
  notes?: string;
  progressPercentage: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IslamicStudyGrade {
  id: string;
  studentId: string;
  studentName: string;
  subjectId: string;
  subjectName: string;
  academicYearId: string;
  term: string;
  quranRecitation?: number;
  islamicHistory?: number;
  fiqh?: number;
  hadith?: number;
  akhlaq?: number;
  overallGrade?: string;
  teacherId: string;
  teacherName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PrayerLog {
  id: string;
  studentId: string;
  studentName: string;
  date: Date;
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
  totalPrayers: number;
  notes?: string;
  verifiedBy?: string;
  verifierName?: string;
  createdAt: Date;
}

export interface IslamicCalendarEvent {
  id: string;
  name: string;
  arabicName: string;
  bengaliName: string;
  date: Date;
  type: 'RELIGIOUS' | 'HISTORICAL' | 'EDUCATIONAL';
  description: string;
  significance: string;
  isHoliday: boolean;
}

export interface StudentIslamicProfile {
  studentId: string;
  studentName: string;
  totalHifzProgress: number;
  completedSurahs: number;
  averageIslamicGrade: number;
  monthlyPrayerRate: number;
  recentAchievements: string[];
  currentHifzGoal?: {
    surahName: string;
    targetDate: Date;
    progress: number;
  };
}

export class IslamicEducationService {

  /**
   * Get all Quran Surahs with basic information
   */
  static async getAllSurahs(): Promise<QuranSurah[]> {
    try {
      // Mock data for now - in production this would come from database
      const surahs: QuranSurah[] = [
        {
          id: 'surah_1',
          surahNumber: 1,
          arabicName: 'الفاتحة',
          englishName: 'Al-Fatiha',
          bengaliName: 'আল-ফাতিহা',
          totalAyahs: 7,
          revelationType: 'Meccan',
          description: 'The Opening - The first chapter of the Quran'
        },
        {
          id: 'surah_2',
          surahNumber: 2,
          arabicName: 'البقرة',
          englishName: 'Al-Baqarah',
          bengaliName: 'আল-বাকারাহ',
          totalAyahs: 286,
          revelationType: 'Medinan',
          description: 'The Cow - The longest chapter of the Quran'
        },
        {
          id: 'surah_114',
          surahNumber: 114,
          arabicName: 'الناس',
          englishName: 'An-Nas',
          bengaliName: 'আন-নাস',
          totalAyahs: 6,
          revelationType: 'Meccan',
          description: 'Mankind - The last chapter of the Quran'
        }
      ];

      return surahs;

    } catch (error) {
      console.error('Error fetching Quran surahs:', error);
      throw new Error('Failed to fetch Quran surahs');
    }
  }

  /**
   * Get Hifz progress for a student
   */
  static async getStudentHifzProgress(studentId: string): Promise<HifzProgress[]> {
    try {
      // Mock implementation - will be replaced with real database queries
      const mockProgress: HifzProgress[] = [
        {
          id: 'hifz_1',
          studentId: studentId,
          studentName: 'Ahmed Rahman',
          surahId: 'surah_1',
          surahName: 'Al-Fatiha',
          startAyah: 1,
          endAyah: 7,
          memorizedAyahs: 7,
          reviewCount: 5,
          lastReviewDate: new Date(),
          status: 'COMPLETED',
          teacherId: 'teacher_1',
          teacherName: 'Ustaz Abdullah',
          notes: 'Excellent memorization with proper tajweed',
          progressPercentage: 100,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'hifz_2',
          studentId: studentId,
          studentName: 'Ahmed Rahman',
          surahId: 'surah_114',
          surahName: 'An-Nas',
          startAyah: 1,
          endAyah: 6,
          memorizedAyahs: 4,
          reviewCount: 2,
          lastReviewDate: new Date(),
          status: 'IN_PROGRESS',
          teacherId: 'teacher_1',
          teacherName: 'Ustaz Abdullah',
          notes: 'Good progress, needs more practice on pronunciation',
          progressPercentage: 67,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      return mockProgress;

    } catch (error) {
      console.error('Error fetching Hifz progress:', error);
      throw new Error('Failed to fetch Hifz progress');
    }
  }

  /**
   * Update Hifz progress for a student
   */
  static async updateHifzProgress(progressData: {
    id?: string;
    studentId: string;
    surahId: string;
    memorizedAyahs: number;
    status: 'IN_PROGRESS' | 'COMPLETED' | 'NEEDS_REVIEW';
    teacherId: string;
    notes?: string;
  }): Promise<HifzProgress> {
    try {
      // Mock implementation
      const updatedProgress: HifzProgress = {
        id: progressData.id || `hifz_${Date.now()}`,
        studentId: progressData.studentId,
        studentName: 'Student Name', // Would be fetched from database
        surahId: progressData.surahId,
        surahName: 'Surah Name', // Would be fetched from surah data
        startAyah: 1,
        endAyah: 10, // Would be fetched from surah data
        memorizedAyahs: progressData.memorizedAyahs,
        reviewCount: 0,
        lastReviewDate: new Date(),
        status: progressData.status,
        teacherId: progressData.teacherId,
        teacherName: 'Teacher Name', // Would be fetched from database
        notes: progressData.notes,
        progressPercentage: Math.round((progressData.memorizedAyahs / 10) * 100),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('Hifz progress updated (mock):', updatedProgress);
      return updatedProgress;

    } catch (error) {
      console.error('Error updating Hifz progress:', error);
      throw new Error('Failed to update Hifz progress');
    }
  }

  /**
   * Get Islamic study grades for a student
   */
  static async getStudentIslamicGrades(studentId: string, academicYearId?: string): Promise<IslamicStudyGrade[]> {
    try {
      // Mock implementation
      const mockGrades: IslamicStudyGrade[] = [
        {
          id: 'islamic_grade_1',
          studentId: studentId,
          studentName: 'Ahmed Rahman',
          subjectId: 'islamic_studies',
          subjectName: 'Islamic Studies',
          academicYearId: academicYearId || 'current_year',
          term: 'First Term',
          quranRecitation: 85,
          islamicHistory: 78,
          fiqh: 82,
          hadith: 88,
          akhlaq: 90,
          overallGrade: 'A',
          teacherId: 'teacher_1',
          teacherName: 'Ustaz Abdullah',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      return mockGrades;

    } catch (error) {
      console.error('Error fetching Islamic grades:', error);
      throw new Error('Failed to fetch Islamic grades');
    }
  }

  /**
   * Record Islamic study grades
   */
  static async recordIslamicGrades(gradeData: {
    studentId: string;
    subjectId: string;
    academicYearId: string;
    term: string;
    quranRecitation?: number;
    islamicHistory?: number;
    fiqh?: number;
    hadith?: number;
    akhlaq?: number;
    teacherId: string;
  }): Promise<IslamicStudyGrade> {
    try {
      // Calculate overall grade
      const scores = [
        gradeData.quranRecitation,
        gradeData.islamicHistory,
        gradeData.fiqh,
        gradeData.hadith,
        gradeData.akhlaq
      ].filter(score => score !== undefined) as number[];

      const average = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
      
      let overallGrade = 'F';
      if (average >= 90) overallGrade = 'A+';
      else if (average >= 80) overallGrade = 'A';
      else if (average >= 70) overallGrade = 'B';
      else if (average >= 60) overallGrade = 'C';
      else if (average >= 50) overallGrade = 'D';

      const newGrade: IslamicStudyGrade = {
        id: `islamic_grade_${Date.now()}`,
        studentId: gradeData.studentId,
        studentName: 'Student Name', // Would be fetched from database
        subjectId: gradeData.subjectId,
        subjectName: 'Subject Name', // Would be fetched from database
        academicYearId: gradeData.academicYearId,
        term: gradeData.term,
        quranRecitation: gradeData.quranRecitation,
        islamicHistory: gradeData.islamicHistory,
        fiqh: gradeData.fiqh,
        hadith: gradeData.hadith,
        akhlaq: gradeData.akhlaq,
        overallGrade,
        teacherId: gradeData.teacherId,
        teacherName: 'Teacher Name', // Would be fetched from database
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('Islamic grades recorded (mock):', newGrade);
      return newGrade;

    } catch (error) {
      console.error('Error recording Islamic grades:', error);
      throw new Error('Failed to record Islamic grades');
    }
  }

  /**
   * Get prayer logs for a student
   */
  static async getStudentPrayerLogs(studentId: string, startDate?: Date, endDate?: Date): Promise<PrayerLog[]> {
    try {
      const start = startDate || startOfMonth(new Date());
      const end = endDate || endOfMonth(new Date());

      // Mock implementation
      const mockLogs: PrayerLog[] = [];
      const currentDate = new Date(start);

      while (currentDate <= end) {
        const fajr = Math.random() > 0.1;
        const dhuhr = Math.random() > 0.05;
        const asr = Math.random() > 0.1;
        const maghrib = Math.random() > 0.05;
        const isha = Math.random() > 0.15;

        mockLogs.push({
          id: `prayer_${studentId}_${currentDate.getTime()}`,
          studentId: studentId,
          studentName: 'Ahmed Rahman',
          date: new Date(currentDate),
          fajr,
          dhuhr,
          asr,
          maghrib,
          isha,
          totalPrayers: [fajr, dhuhr, asr, maghrib, isha].filter(Boolean).length,
          notes: Math.random() > 0.8 ? 'Prayed at mosque' : undefined,
          verifiedBy: Math.random() > 0.7 ? 'teacher_1' : undefined,
          verifierName: Math.random() > 0.7 ? 'Ustaz Abdullah' : undefined,
          createdAt: new Date(currentDate)
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return mockLogs;

    } catch (error) {
      console.error('Error fetching prayer logs:', error);
      throw new Error('Failed to fetch prayer logs');
    }
  }

  /**
   * Record daily prayer log
   */
  static async recordPrayerLog(logData: {
    studentId: string;
    date: Date;
    fajr: boolean;
    dhuhr: boolean;
    asr: boolean;
    maghrib: boolean;
    isha: boolean;
    notes?: string;
    verifiedBy?: string;
  }): Promise<PrayerLog> {
    try {
      const totalPrayers = [
        logData.fajr,
        logData.dhuhr,
        logData.asr,
        logData.maghrib,
        logData.isha
      ].filter(Boolean).length;

      const prayerLog: PrayerLog = {
        id: `prayer_${logData.studentId}_${logData.date.getTime()}`,
        studentId: logData.studentId,
        studentName: 'Student Name', // Would be fetched from database
        date: logData.date,
        fajr: logData.fajr,
        dhuhr: logData.dhuhr,
        asr: logData.asr,
        maghrib: logData.maghrib,
        isha: logData.isha,
        totalPrayers,
        notes: logData.notes,
        verifiedBy: logData.verifiedBy,
        verifierName: logData.verifiedBy ? 'Verifier Name' : undefined,
        createdAt: new Date()
      };

      console.log('Prayer log recorded (mock):', prayerLog);
      return prayerLog;

    } catch (error) {
      console.error('Error recording prayer log:', error);
      throw new Error('Failed to record prayer log');
    }
  }

  /**
   * Get Islamic calendar events
   */
  static async getIslamicCalendarEvents(year?: number): Promise<IslamicCalendarEvent[]> {
    try {
      const currentYear = year || new Date().getFullYear();

      // Mock Islamic calendar events
      const events: IslamicCalendarEvent[] = [
        {
          id: 'ramadan_start',
          name: 'Ramadan Begins',
          arabicName: 'بداية رمضان',
          bengaliName: 'রমজান শুরু',
          date: new Date(currentYear, 2, 23), // Approximate date
          type: 'RELIGIOUS',
          description: 'The holy month of fasting begins',
          significance: 'Month of fasting, prayer, reflection and community',
          isHoliday: true
        },
        {
          id: 'eid_fitr',
          name: 'Eid al-Fitr',
          arabicName: 'عيد الفطر',
          bengaliName: 'ঈদুল ফিতর',
          date: new Date(currentYear, 3, 22), // Approximate date
          type: 'RELIGIOUS',
          description: 'Festival of Breaking the Fast',
          significance: 'Celebration marking the end of Ramadan',
          isHoliday: true
        },
        {
          id: 'eid_adha',
          name: 'Eid al-Adha',
          arabicName: 'عيد الأضحى',
          bengaliName: 'ঈদুল আযহা',
          date: new Date(currentYear, 6, 28), // Approximate date
          type: 'RELIGIOUS',
          description: 'Festival of Sacrifice',
          significance: 'Commemorates Ibrahim\'s willingness to sacrifice his son',
          isHoliday: true
        },
        {
          id: 'mawlid',
          name: 'Mawlid an-Nabi',
          arabicName: 'المولد النبوي',
          bengaliName: 'মীলাদুন্নবী',
          date: new Date(currentYear, 9, 15), // Approximate date
          type: 'RELIGIOUS',
          description: 'Birth of Prophet Muhammad (PBUH)',
          significance: 'Celebration of the Prophet\'s birth and teachings',
          isHoliday: true
        }
      ];

      return events;

    } catch (error) {
      console.error('Error fetching Islamic calendar events:', error);
      throw new Error('Failed to fetch Islamic calendar events');
    }
  }

  /**
   * Get comprehensive Islamic profile for a student
   */
  static async getStudentIslamicProfile(studentId: string): Promise<StudentIslamicProfile> {
    try {
      const hifzProgress = await this.getStudentHifzProgress(studentId);
      const islamicGrades = await this.getStudentIslamicGrades(studentId);
      const prayerLogs = await this.getStudentPrayerLogs(studentId);

      // Calculate statistics
      const totalHifzProgress = hifzProgress.reduce((sum, progress) => sum + progress.progressPercentage, 0) / hifzProgress.length || 0;
      const completedSurahs = hifzProgress.filter(progress => progress.status === 'COMPLETED').length;
      
      const averageIslamicGrade = islamicGrades.length > 0 
        ? islamicGrades.reduce((sum, grade) => {
            const scores = [grade.quranRecitation, grade.islamicHistory, grade.fiqh, grade.hadith, grade.akhlaq]
              .filter(score => score !== undefined) as number[];
            return sum + (scores.reduce((s, score) => s + score, 0) / scores.length);
          }, 0) / islamicGrades.length
        : 0;

      const monthlyPrayerRate = prayerLogs.length > 0
        ? (prayerLogs.reduce((sum, log) => sum + log.totalPrayers, 0) / (prayerLogs.length * 5)) * 100
        : 0;

      const recentAchievements = [
        'Completed Surah Al-Fatiha memorization',
        'Achieved 90% prayer attendance this month',
        'Excellent performance in Islamic History'
      ];

      const currentHifzGoal = hifzProgress.find(progress => progress.status === 'IN_PROGRESS');

      const profile: StudentIslamicProfile = {
        studentId,
        studentName: 'Ahmed Rahman', // Would be fetched from database
        totalHifzProgress: Math.round(totalHifzProgress),
        completedSurahs,
        averageIslamicGrade: Math.round(averageIslamicGrade),
        monthlyPrayerRate: Math.round(monthlyPrayerRate),
        recentAchievements,
        currentHifzGoal: currentHifzGoal ? {
          surahName: currentHifzGoal.surahName,
          targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          progress: currentHifzGoal.progressPercentage
        } : undefined
      };

      return profile;

    } catch (error) {
      console.error('Error fetching Islamic profile:', error);
      throw new Error('Failed to fetch Islamic profile');
    }
  }

  /**
   * Get prayer times for Bangladesh (mock implementation)
   */
  static async getPrayerTimes(date: Date = new Date()): Promise<{
    fajr: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
    sunrise: string;
    sunset: string;
  }> {
    try {
      // Mock prayer times for Dhaka, Bangladesh
      // In production, this would use a proper Islamic calendar API
      return {
        fajr: '05:15',
        sunrise: '06:30',
        dhuhr: '12:15',
        asr: '15:45',
        sunset: '18:00',
        maghrib: '18:00',
        isha: '19:15'
      };

    } catch (error) {
      console.error('Error fetching prayer times:', error);
      throw new Error('Failed to fetch prayer times');
    }
  }

  /**
   * Get class-wise Islamic education statistics
   */
  static async getClassIslamicStats(classLevelId: string, sectionId?: string): Promise<{
    totalStudents: number;
    averageHifzProgress: number;
    averageIslamicGrade: number;
    averagePrayerRate: number;
    topPerformers: Array<{
      studentId: string;
      studentName: string;
      overallScore: number;
    }>;
  }> {
    try {
      // Mock implementation
      const mockStats = {
        totalStudents: 35,
        averageHifzProgress: 65,
        averageIslamicGrade: 78,
        averagePrayerRate: 82,
        topPerformers: [
          {
            studentId: 'student_1',
            studentName: 'Ahmed Rahman',
            overallScore: 92
          },
          {
            studentId: 'student_2',
            studentName: 'Fatima Khatun',
            overallScore: 88
          },
          {
            studentId: 'student_3',
            studentName: 'Abdullah Al-Mahmud',
            overallScore: 85
          }
        ]
      };

      return mockStats;

    } catch (error) {
      console.error('Error fetching class Islamic stats:', error);
      throw new Error('Failed to fetch class Islamic statistics');
    }
  }

  /**
   * Generate Islamic education report
   */
  static async generateIslamicEducationReport(studentId: string, reportType: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL'): Promise<{
    reportId: string;
    studentProfile: StudentIslamicProfile;
    hifzProgress: HifzProgress[];
    islamicGrades: IslamicStudyGrade[];
    prayerSummary: {
      totalDays: number;
      prayerRate: number;
      mostConsistentPrayer: string;
      improvementAreas: string[];
    };
    recommendations: string[];
    generatedAt: Date;
  }> {
    try {
      const studentProfile = await this.getStudentIslamicProfile(studentId);
      const hifzProgress = await this.getStudentHifzProgress(studentId);
      const islamicGrades = await this.getStudentIslamicGrades(studentId);
      const prayerLogs = await this.getStudentPrayerLogs(studentId);

      // Analyze prayer data
      const prayerCounts = {
        fajr: prayerLogs.filter(log => log.fajr).length,
        dhuhr: prayerLogs.filter(log => log.dhuhr).length,
        asr: prayerLogs.filter(log => log.asr).length,
        maghrib: prayerLogs.filter(log => log.maghrib).length,
        isha: prayerLogs.filter(log => log.isha).length
      };

      const mostConsistentPrayer = Object.entries(prayerCounts)
        .sort(([,a], [,b]) => b - a)[0][0];

      const improvementAreas = Object.entries(prayerCounts)
        .filter(([,count]) => count < prayerLogs.length * 0.8)
        .map(([prayer]) => prayer);

      const recommendations = [
        'Continue excellent progress in Hifz memorization',
        'Focus on improving Fajr prayer consistency',
        'Review Islamic History concepts for better understanding',
        'Practice Tajweed rules for better Quran recitation'
      ];

      const report = {
        reportId: `islamic_report_${studentId}_${Date.now()}`,
        studentProfile,
        hifzProgress,
        islamicGrades,
        prayerSummary: {
          totalDays: prayerLogs.length,
          prayerRate: studentProfile.monthlyPrayerRate,
          mostConsistentPrayer,
          improvementAreas
        },
        recommendations,
        generatedAt: new Date()
      };

      console.log('Islamic education report generated (mock):', report.reportId);
      return report;

    } catch (error) {
      console.error('Error generating Islamic education report:', error);
      throw new Error('Failed to generate Islamic education report');
    }
  }
}
