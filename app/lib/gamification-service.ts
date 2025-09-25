import { prisma } from './prisma';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'ACADEMIC' | 'ATTENDANCE' | 'BEHAVIOR' | 'ISLAMIC';
  iconUrl?: string;
  points: number;
  criteria: any;
  isActive: boolean;
  createdAt: Date;
}

export interface Badge {
  id: string;
  studentId: string;
  studentName: string;
  achievementId: string;
  achievementName: string;
  earnedDate: Date;
  points: number;
  notes?: string;
  category: string;
  iconUrl?: string;
}

export interface LeaderboardEntry {
  rank: number;
  studentId: string;
  studentName: string;
  className: string;
  section: string;
  totalPoints: number;
  badgeCount: number;
  recentAchievements: string[];
  profileImage?: string;
}

export interface StudentGameProfile {
  studentId: string;
  studentName: string;
  totalPoints: number;
  level: number;
  nextLevelPoints: number;
  badges: Badge[];
  recentAchievements: Achievement[];
  rank: {
    overall: number;
    class: number;
    islamic: number;
  };
  streaks: {
    attendance: number;
    prayer: number;
    homework: number;
  };
  progressToNextLevel: number;
}

export interface GameificationStats {
  totalStudents: number;
  totalBadgesEarned: number;
  averagePointsPerStudent: number;
  mostPopularAchievement: string;
  topPerformers: LeaderboardEntry[];
  categoryBreakdown: { [key: string]: number };
}

export class GamificationService {

  /**
   * Get all available achievements
   */
  static async getAllAchievements(): Promise<Achievement[]> {
    try {
      // Mock achievements with Islamic themes
      const achievements: Achievement[] = [
        {
          id: 'perfect_attendance_week',
          name: 'Perfect Week',
          description: 'Attended all classes for a full week',
          category: 'ATTENDANCE',
          iconUrl: '/icons/achievements/perfect-week.svg',
          points: 50,
          criteria: { type: 'attendance', period: 'week', percentage: 100 },
          isActive: true,
          createdAt: new Date()
        },
        {
          id: 'quran_surah_complete',
          name: 'Hafiz Progress',
          description: 'Completed memorization of a Quran Surah',
          category: 'ISLAMIC',
          iconUrl: '/icons/achievements/quran-memorization.svg',
          points: 200,
          criteria: { type: 'hifz', action: 'complete_surah' },
          isActive: true,
          createdAt: new Date()
        },
        {
          id: 'excellent_grade',
          name: 'Academic Excellence',
          description: 'Achieved 90% or above in an exam',
          category: 'ACADEMIC',
          iconUrl: '/icons/achievements/academic-excellence.svg',
          points: 100,
          criteria: { type: 'grade', minimum: 90 },
          isActive: true,
          createdAt: new Date()
        },
        {
          id: 'prayer_consistency',
          name: 'Devoted Worshipper',
          description: 'Maintained 95% prayer attendance for a month',
          category: 'ISLAMIC',
          iconUrl: '/icons/achievements/prayer-consistency.svg',
          points: 150,
          criteria: { type: 'prayer', period: 'month', percentage: 95 },
          isActive: true,
          createdAt: new Date()
        },
        {
          id: 'helpful_student',
          name: 'Helpful Companion',
          description: 'Demonstrated excellent Islamic character and helpfulness',
          category: 'BEHAVIOR',
          iconUrl: '/icons/achievements/helpful-student.svg',
          points: 75,
          criteria: { type: 'behavior', trait: 'helpfulness' },
          isActive: true,
          createdAt: new Date()
        },
        {
          id: 'assignment_streak',
          name: 'Dedicated Learner',
          description: 'Submitted assignments on time for 10 consecutive times',
          category: 'ACADEMIC',
          iconUrl: '/icons/achievements/assignment-streak.svg',
          points: 80,
          criteria: { type: 'assignment', streak: 10 },
          isActive: true,
          createdAt: new Date()
        }
      ];

      return achievements;

    } catch (error) {
      console.error('Error fetching achievements:', error);
      throw new Error('Failed to fetch achievements');
    }
  }

  /**
   * Get student's badges
   */
  static async getStudentBadges(studentId: string): Promise<Badge[]> {
    try {
      // Mock implementation
      const mockBadges: Badge[] = [
        {
          id: 'badge_1',
          studentId: studentId,
          studentName: 'Ahmed Rahman',
          achievementId: 'perfect_attendance_week',
          achievementName: 'Perfect Week',
          earnedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          points: 50,
          notes: 'Excellent attendance record',
          category: 'ATTENDANCE',
          iconUrl: '/icons/achievements/perfect-week.svg'
        },
        {
          id: 'badge_2',
          studentId: studentId,
          studentName: 'Ahmed Rahman',
          achievementId: 'quran_surah_complete',
          achievementName: 'Hafiz Progress',
          earnedDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          points: 200,
          notes: 'Completed Surah Al-Fatiha memorization',
          category: 'ISLAMIC',
          iconUrl: '/icons/achievements/quran-memorization.svg'
        }
      ];

      return mockBadges;

    } catch (error) {
      console.error('Error fetching student badges:', error);
      throw new Error('Failed to fetch student badges');
    }
  }

  /**
   * Award achievement to student
   */
  static async awardAchievement(data: {
    studentId: string;
    achievementId: string;
    notes?: string;
    awardedBy?: string;
  }): Promise<Badge> {
    try {
      // Get achievement details
      const achievements = await this.getAllAchievements();
      const achievement = achievements.find(a => a.id === data.achievementId);
      
      if (!achievement) {
        throw new Error('Achievement not found');
      }

      // Check if student already has this badge
      const existingBadges = await this.getStudentBadges(data.studentId);
      const existingBadge = existingBadges.find(b => b.achievementId === data.achievementId);
      
      if (existingBadge) {
        throw new Error('Student already has this achievement');
      }

      // Create new badge
      const newBadge: Badge = {
        id: `badge_${Date.now()}`,
        studentId: data.studentId,
        studentName: 'Student Name', // Would be fetched from database
        achievementId: data.achievementId,
        achievementName: achievement.name,
        earnedDate: new Date(),
        points: achievement.points,
        notes: data.notes,
        category: achievement.category,
        iconUrl: achievement.iconUrl
      };

      // Mock storage - in production this would save to database
      console.log('Badge awarded:', newBadge);

      // Update student's total points
      await this.updateStudentPoints(data.studentId, achievement.points);

      return newBadge;

    } catch (error) {
      console.error('Error awarding achievement:', error);
      throw new Error('Failed to award achievement');
    }
  }

  /**
   * Get leaderboard
   */
  static async getLeaderboard(options: {
    type?: 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'ALL_TIME';
    category?: 'OVERALL' | 'SUBJECT_SPECIFIC' | 'ISLAMIC_STUDIES';
    classLevelId?: string;
    sectionId?: string;
    limit?: number;
  } = {}): Promise<LeaderboardEntry[]> {
    try {
      const { type = 'ALL_TIME', category = 'OVERALL', limit = 10 } = options;

      // Mock leaderboard data
      const mockLeaderboard: LeaderboardEntry[] = [
        {
          rank: 1,
          studentId: 'student_1',
          studentName: 'Ahmed Rahman',
          className: 'Class 8',
          section: 'A',
          totalPoints: 1250,
          badgeCount: 8,
          recentAchievements: ['Perfect Week', 'Hafiz Progress', 'Academic Excellence'],
          profileImage: '/images/students/ahmed.jpg'
        },
        {
          rank: 2,
          studentId: 'student_2',
          studentName: 'Fatima Khatun',
          className: 'Class 8',
          section: 'A',
          totalPoints: 1180,
          badgeCount: 7,
          recentAchievements: ['Devoted Worshipper', 'Helpful Companion'],
          profileImage: '/images/students/fatima.jpg'
        },
        {
          rank: 3,
          studentId: 'student_3',
          studentName: 'Abdullah Al-Mahmud',
          className: 'Class 8',
          section: 'B',
          totalPoints: 1050,
          badgeCount: 6,
          recentAchievements: ['Dedicated Learner', 'Perfect Week'],
          profileImage: '/images/students/abdullah.jpg'
        }
      ];

      return mockLeaderboard.slice(0, limit);

    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      throw new Error('Failed to fetch leaderboard');
    }
  }

  /**
   * Get student's game profile
   */
  static async getStudentGameProfile(studentId: string): Promise<StudentGameProfile> {
    try {
      const badges = await this.getStudentBadges(studentId);
      const achievements = await this.getAllAchievements();
      
      const totalPoints = badges.reduce((sum, badge) => sum + badge.points, 0);
      const level = Math.floor(totalPoints / 500) + 1; // 500 points per level
      const nextLevelPoints = level * 500;
      const progressToNextLevel = ((totalPoints % 500) / 500) * 100;

      const recentAchievements = achievements
        .filter(achievement => 
          badges.some(badge => 
            badge.achievementId === achievement.id && 
            badge.earnedDate > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          )
        )
        .slice(0, 5);

      const profile: StudentGameProfile = {
        studentId,
        studentName: 'Ahmed Rahman', // Would be fetched from database
        totalPoints,
        level,
        nextLevelPoints,
        badges,
        recentAchievements,
        rank: {
          overall: 1, // Would be calculated from leaderboard
          class: 1,
          islamic: 1
        },
        streaks: {
          attendance: 15, // Mock data
          prayer: 28,
          homework: 12
        },
        progressToNextLevel: Math.round(progressToNextLevel)
      };

      return profile;

    } catch (error) {
      console.error('Error fetching student game profile:', error);
      throw new Error('Failed to fetch student game profile');
    }
  }

  /**
   * Check and award automatic achievements
   */
  static async checkAndAwardAchievements(studentId: string, context: {
    type: 'attendance' | 'grade' | 'assignment' | 'prayer' | 'behavior';
    data: any;
  }): Promise<Badge[]> {
    try {
      const newBadges: Badge[] = [];
      const achievements = await this.getAllAchievements();
      const studentBadges = await this.getStudentBadges(studentId);
      const earnedAchievementIds = studentBadges.map(b => b.achievementId);

      for (const achievement of achievements) {
        // Skip if student already has this achievement
        if (earnedAchievementIds.includes(achievement.id)) {
          continue;
        }

        // Check if criteria is met
        const criteriaMatch = this.checkAchievementCriteria(achievement, context);
        
        if (criteriaMatch) {
          try {
            const badge = await this.awardAchievement({
              studentId,
              achievementId: achievement.id,
              notes: `Auto-awarded for ${context.type} achievement`
            });
            newBadges.push(badge);
          } catch (error) {
            console.error(`Error awarding achievement ${achievement.id}:`, error);
          }
        }
      }

      return newBadges;

    } catch (error) {
      console.error('Error checking achievements:', error);
      return [];
    }
  }

  /**
   * Update student points
   */
  private static async updateStudentPoints(studentId: string, points: number): Promise<void> {
    try {
      // Mock implementation - in production this would update student's total points
      console.log(`Adding ${points} points to student ${studentId}`);
      
      // This would update a student points table or field
      // await prisma.student.update({
      //   where: { id: studentId },
      //   data: { totalPoints: { increment: points } }
      // });

    } catch (error) {
      console.error('Error updating student points:', error);
    }
  }

  /**
   * Check if achievement criteria is met
   */
  private static checkAchievementCriteria(achievement: Achievement, context: any): boolean {
    const criteria = achievement.criteria;

    switch (achievement.id) {
      case 'perfect_attendance_week':
        return context.type === 'attendance' && 
               context.data.weeklyPercentage >= 100;

      case 'excellent_grade':
        return context.type === 'grade' && 
               context.data.percentage >= 90;

      case 'quran_surah_complete':
        return context.type === 'prayer' && 
               context.data.surahCompleted === true;

      case 'prayer_consistency':
        return context.type === 'prayer' && 
               context.data.monthlyPercentage >= 95;

      case 'assignment_streak':
        return context.type === 'assignment' && 
               context.data.consecutiveOnTime >= 10;

      case 'helpful_student':
        return context.type === 'behavior' && 
               context.data.helpfulnessScore >= 8;

      default:
        return false;
    }
  }

  /**
   * Get gamification statistics
   */
  static async getGamificationStats(): Promise<GameificationStats> {
    try {
      // Mock implementation
      return {
        totalStudents: 450,
        totalBadgesEarned: 2340,
        averagePointsPerStudent: 520,
        mostPopularAchievement: 'Perfect Week',
        topPerformers: await this.getLeaderboard({ limit: 5 }),
        categoryBreakdown: {
          'ACADEMIC': 45,
          'ATTENDANCE': 30,
          'ISLAMIC': 20,
          'BEHAVIOR': 5
        }
      };

    } catch (error) {
      console.error('Error fetching gamification stats:', error);
      throw new Error('Failed to fetch gamification statistics');
    }
  }

  /**
   * Create custom achievement
   */
  static async createCustomAchievement(achievementData: {
    name: string;
    description: string;
    category: 'ACADEMIC' | 'ATTENDANCE' | 'BEHAVIOR' | 'ISLAMIC';
    points: number;
    criteria: any;
    iconUrl?: string;
    createdBy: string;
  }): Promise<Achievement> {
    try {
      const achievement: Achievement = {
        id: `custom_${Date.now()}`,
        name: achievementData.name,
        description: achievementData.description,
        category: achievementData.category,
        iconUrl: achievementData.iconUrl,
        points: achievementData.points,
        criteria: achievementData.criteria,
        isActive: true,
        createdAt: new Date()
      };

      // Mock storage
      console.log('Custom achievement created:', achievement);

      return achievement;

    } catch (error) {
      console.error('Error creating custom achievement:', error);
      throw new Error('Failed to create custom achievement');
    }
  }

  /**
   * Get class leaderboard
   */
  static async getClassLeaderboard(classLevelId: string, sectionId?: string): Promise<LeaderboardEntry[]> {
    try {
      const leaderboard = await this.getLeaderboard({
        classLevelId,
        sectionId,
        limit: 20
      });

      return leaderboard;

    } catch (error) {
      console.error('Error fetching class leaderboard:', error);
      throw new Error('Failed to fetch class leaderboard');
    }
  }

  /**
   * Get Islamic achievements leaderboard
   */
  static async getIslamicLeaderboard(): Promise<LeaderboardEntry[]> {
    try {
      const leaderboard = await this.getLeaderboard({
        category: 'ISLAMIC_STUDIES',
        limit: 15
      });

      return leaderboard;

    } catch (error) {
      console.error('Error fetching Islamic leaderboard:', error);
      throw new Error('Failed to fetch Islamic leaderboard');
    }
  }

  /**
   * Generate achievement report for student
   */
  static async generateAchievementReport(studentId: string): Promise<{
    profile: StudentGameProfile;
    monthlyProgress: Array<{
      month: string;
      pointsEarned: number;
      badgesEarned: number;
      achievements: string[];
    }>;
    recommendations: string[];
    nextGoals: Array<{
      achievementId: string;
      name: string;
      description: string;
      pointsNeeded: number;
      estimatedTime: string;
    }>;
  }> {
    try {
      const profile = await this.getStudentGameProfile(studentId);
      const achievements = await this.getAllAchievements();
      
      // Mock monthly progress
      const monthlyProgress = [
        {
          month: 'January 2024',
          pointsEarned: 320,
          badgesEarned: 3,
          achievements: ['Perfect Week', 'Academic Excellence']
        },
        {
          month: 'February 2024',
          pointsEarned: 280,
          badgesEarned: 2,
          achievements: ['Hafiz Progress']
        }
      ];

      // Generate recommendations
      const recommendations = [
        'Focus on maintaining prayer consistency to earn "Devoted Worshipper" badge',
        'Continue excellent attendance record for more attendance achievements',
        'Help classmates with studies to earn "Helpful Companion" badge',
        'Complete Quran memorization goals for Islamic achievements'
      ];

      // Find next achievable goals
      const earnedAchievementIds = profile.badges.map(b => b.achievementId);
      const availableAchievements = achievements.filter(a => !earnedAchievementIds.includes(a.id));
      
      const nextGoals = availableAchievements.slice(0, 3).map(achievement => ({
        achievementId: achievement.id,
        name: achievement.name,
        description: achievement.description,
        pointsNeeded: achievement.points,
        estimatedTime: this.estimateAchievementTime(achievement)
      }));

      return {
        profile,
        monthlyProgress,
        recommendations,
        nextGoals
      };

    } catch (error) {
      console.error('Error generating achievement report:', error);
      throw new Error('Failed to generate achievement report');
    }
  }

  /**
   * Estimate time to achieve an achievement
   */
  private static estimateAchievementTime(achievement: Achievement): string {
    switch (achievement.category) {
      case 'ATTENDANCE':
        return '1-2 weeks';
      case 'ACADEMIC':
        return '1 month';
      case 'ISLAMIC':
        return '2-3 months';
      case 'BEHAVIOR':
        return '2-4 weeks';
      default:
        return '1 month';
    }
  }

  /**
   * Get achievement suggestions for teacher
   */
  static async getAchievementSuggestions(teacherId: string): Promise<Array<{
    studentId: string;
    studentName: string;
    suggestedAchievements: Array<{
      achievementId: string;
      name: string;
      reason: string;
      confidence: number;
    }>;
  }>> {
    try {
      // Mock suggestions based on student performance
      return [
        {
          studentId: 'student_1',
          studentName: 'Ahmed Rahman',
          suggestedAchievements: [
            {
              achievementId: 'helpful_student',
              name: 'Helpful Companion',
              reason: 'Consistently helps classmates with studies',
              confidence: 85
            }
          ]
        },
        {
          studentId: 'student_2',
          studentName: 'Fatima Khatun',
          suggestedAchievements: [
            {
              achievementId: 'prayer_consistency',
              name: 'Devoted Worshipper',
              reason: 'Excellent prayer attendance record',
              confidence: 92
            }
          ]
        }
      ];

    } catch (error) {
      console.error('Error fetching achievement suggestions:', error);
      throw new Error('Failed to fetch achievement suggestions');
    }
  }
}
