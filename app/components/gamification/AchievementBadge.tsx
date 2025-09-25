'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from '../icons/IconLibrary';
import { Trophy, Star, Award, Crown, Gem, Sparkles, Heart, Target } from 'lucide-react';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  type: 'academic' | 'attendance' | 'behavior' | 'islamic' | 'leadership' | 'creativity' | 'sports' | 'community';
  level: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  progress?: number;
  maxProgress?: number;
  earnedAt?: Date;
  isNew?: boolean;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface AchievementBadgeProps {
  achievement: Achievement;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showProgress?: boolean;
  showTitle?: boolean;
  showDescription?: boolean;
  animated?: boolean;
  onClick?: (achievement: Achievement) => void;
  onShare?: (achievement: Achievement) => void;
  className?: string;
  bengaliText?: boolean;
}

const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  achievement,
  size = 'md',
  showProgress = true,
  showTitle = true,
  showDescription = false,
  animated = true,
  onClick,
  onShare,
  className = '',
  bengaliText = false,
}) => {
  const [isRevealing, setIsRevealing] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const isEarned = !!achievement.earnedAt;
  const progressPercentage = achievement.progress && achievement.maxProgress 
    ? (achievement.progress / achievement.maxProgress) * 100 
    : 0;

  // Trigger celebration animation for new achievements
  useEffect(() => {
    if (achievement.isNew && isEarned && animated) {
      setIsRevealing(true);
      const timer = setTimeout(() => {
        setShowCelebration(true);
        // Play achievement sound if available
        if (typeof window !== 'undefined') {
          try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Achievement fanfare sequence
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            let noteIndex = 0;

            const playNote = () => {
              if (noteIndex < notes.length) {
                oscillator.frequency.setValueAtTime(notes[noteIndex], audioContext.currentTime);
                oscillator.type = 'sine';
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                
                noteIndex++;
                setTimeout(playNote, 200);
              }
            };

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 1.2);
            playNote();
          } catch (error) {
            console.log('Achievement sound not supported');
          }
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [achievement.isNew, isEarned, animated]);

  // Size configurations
  const sizeConfigs = {
    sm: {
      badge: 'w-12 h-12',
      icon: 16,
      title: 'text-xs',
      description: 'text-xs',
      container: 'p-2',
    },
    md: {
      badge: 'w-16 h-16',
      icon: 20,
      title: 'text-sm',
      description: 'text-xs',
      container: 'p-3',
    },
    lg: {
      badge: 'w-20 h-20',
      icon: 24,
      title: 'text-base',
      description: 'text-sm',
      container: 'p-4',
    },
    xl: {
      badge: 'w-24 h-24',
      icon: 28,
      title: 'text-lg',
      description: 'text-base',
      container: 'p-6',
    },
  };

  const config = sizeConfigs[size];

  // Type-based icons and colors
  const typeConfigs = {
    academic: {
      icon: Icons.BookOpen,
      color: 'from-blue-400 to-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      textColor: 'text-blue-700 dark:text-blue-300',
    },
    attendance: {
      icon: Icons.Calendar,
      color: 'from-green-400 to-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      textColor: 'text-green-700 dark:text-green-300',
    },
    behavior: {
      icon: Heart,
      color: 'from-pink-400 to-pink-600',
      bgColor: 'bg-pink-50 dark:bg-pink-900/20',
      textColor: 'text-pink-700 dark:text-pink-300',
    },
    islamic: {
      icon: Star,
      color: 'from-purple-400 to-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      textColor: 'text-purple-700 dark:text-purple-300',
    },
    leadership: {
      icon: Crown,
      color: 'from-yellow-400 to-yellow-600',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      textColor: 'text-yellow-700 dark:text-yellow-300',
    },
    creativity: {
      icon: Sparkles,
      color: 'from-indigo-400 to-indigo-600',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
      textColor: 'text-indigo-700 dark:text-indigo-300',
    },
    sports: {
      icon: Trophy,
      color: 'from-orange-400 to-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      textColor: 'text-orange-700 dark:text-orange-300',
    },
    community: {
      icon: Icons.Users,
      color: 'from-teal-400 to-teal-600',
      bgColor: 'bg-teal-50 dark:bg-teal-900/20',
      textColor: 'text-teal-700 dark:text-teal-300',
    },
  };

  // Level-based styling
  const levelConfigs = {
    bronze: {
      border: 'border-amber-600',
      glow: 'shadow-amber-200 dark:shadow-amber-900',
      overlay: 'from-amber-400/20 to-amber-600/20',
    },
    silver: {
      border: 'border-gray-400',
      glow: 'shadow-gray-200 dark:shadow-gray-700',
      overlay: 'from-gray-300/20 to-gray-500/20',
    },
    gold: {
      border: 'border-yellow-500',
      glow: 'shadow-yellow-200 dark:shadow-yellow-900',
      overlay: 'from-yellow-400/20 to-yellow-600/20',
    },
    platinum: {
      border: 'border-blue-400',
      glow: 'shadow-blue-200 dark:shadow-blue-900',
      overlay: 'from-blue-400/20 to-blue-600/20',
    },
    diamond: {
      border: 'border-purple-500',
      glow: 'shadow-purple-200 dark:shadow-purple-900',
      overlay: 'from-purple-400/20 to-purple-600/20',
    },
  };

  const typeConfig = typeConfigs[achievement.type];
  const levelConfig = levelConfigs[achievement.level];
  const IconComponent = typeConfig.icon;

  // Animation variants
  const badgeVariants = {
    hidden: { 
      scale: 0, 
      rotate: -180, 
      opacity: 0 
    },
    visible: { 
      scale: 1, 
      rotate: 0, 
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 20,
        duration: 0.8,
      }
    },
    hover: {
      scale: 1.1,
      rotate: 5,
      transition: {
        duration: 0.2,
      }
    },
    tap: {
      scale: 0.95,
    }
  };

  const celebrationVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      }
    }
  };

  const sparkleVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
      scale: [0, 1.2, 1],
      opacity: [0, 1, 0],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        repeatDelay: 2,
      }
    }
  };

  const toBengaliNumber = (num: number): string => {
    const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return num.toString().replace(/\d/g, (digit) => bengaliDigits[parseInt(digit)]);
  };

  const formatNumber = (num: number): string => {
    return bengaliText ? toBengaliNumber(num) : num.toString();
  };

  return (
    <div className={`relative ${className}`}>
      <motion.div
        className={`
          relative ${config.container} rounded-xl cursor-pointer
          ${typeConfig.bgColor} ${isEarned ? levelConfig.glow : ''}
          ${onClick ? 'hover:shadow-lg' : ''}
          transition-all duration-300
        `}
        variants={badgeVariants}
        initial="hidden"
        animate="visible"
        whileHover={onClick ? "hover" : undefined}
        whileTap={onClick ? "tap" : undefined}
        onClick={() => onClick?.(achievement)}
      >
        {/* Badge */}
        <div className="flex flex-col items-center space-y-2">
          <div className={`
            relative ${config.badge} rounded-full flex items-center justify-center
            ${isEarned 
              ? `bg-gradient-to-br ${typeConfig.color} ${levelConfig.border} border-2 shadow-lg`
              : 'bg-gray-200 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600'
            }
          `}>
            {/* Islamic geometric pattern overlay */}
            {isEarned && (
              <div className="absolute inset-0 rounded-full overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${levelConfig.overlay} opacity-30`} />
                <svg
                  className="absolute inset-0 w-full h-full opacity-20"
                  viewBox="0 0 100 100"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <pattern
                      id={`badge-pattern-${achievement.id}`}
                      x="0"
                      y="0"
                      width="20"
                      height="20"
                      patternUnits="userSpaceOnUse"
                    >
                      <circle cx="10" cy="10" r="1" fill="white" opacity="0.3" />
                      <path
                        d="M10,5 L15,10 L10,15 L5,10 Z"
                        fill="none"
                        stroke="white"
                        strokeWidth="0.5"
                        opacity="0.2"
                      />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill={`url(#badge-pattern-${achievement.id})`} />
                </svg>
              </div>
            )}

            {/* Icon */}
            <IconComponent 
              size={config.icon} 
              className={isEarned ? 'text-white' : 'text-gray-400 dark:text-gray-500'}
            />

            {/* Level indicator */}
            {isEarned && (
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md">
                <span className={`text-xs font-bold ${typeConfig.textColor}`}>
                  {achievement.level === 'bronze' && '🥉'}
                  {achievement.level === 'silver' && '🥈'}
                  {achievement.level === 'gold' && '🥇'}
                  {achievement.level === 'platinum' && '💎'}
                  {achievement.level === 'diamond' && '💠'}
                </span>
              </div>
            )}

            {/* New badge indicator */}
            {achievement.isNew && isEarned && (
              <motion.div
                className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"
                animate={{
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                }}
              >
                <span className="text-white text-xs font-bold">!</span>
              </motion.div>
            )}
          </div>

          {/* Progress bar for unearned achievements */}
          {!isEarned && showProgress && achievement.progress !== undefined && achievement.maxProgress && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <motion.div
                className={`h-2 bg-gradient-to-r ${typeConfig.color} rounded-full`}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
          )}

          {/* Title */}
          {showTitle && (
            <h3 className={`${config.title} font-medium text-center ${typeConfig.textColor} max-w-full truncate`}>
              {achievement.title}
            </h3>
          )}

          {/* Description */}
          {showDescription && (
            <p className={`${config.description} text-gray-600 dark:text-gray-400 text-center`}>
              {achievement.description}
            </p>
          )}

          {/* Progress text */}
          {!isEarned && showProgress && achievement.progress !== undefined && achievement.maxProgress && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatNumber(achievement.progress)} / {formatNumber(achievement.maxProgress)}
            </p>
          )}
        </div>

        {/* Share button for earned achievements */}
        {isEarned && onShare && (
          <motion.button
            className="absolute top-2 right-2 w-6 h-6 bg-white/80 rounded-full flex items-center justify-center shadow-sm"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onShare(achievement);
            }}
          >
            <Icons.Upload size={12} className="text-gray-600" />
          </motion.button>
        )}
      </motion.div>

      {/* Celebration effects */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            variants={celebrationVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            {/* Sparkles */}
            {Array.from({ length: 8 }).map((_, index) => (
              <motion.div
                key={index}
                className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                style={{
                  top: `${20 + Math.random() * 60}%`,
                  left: `${20 + Math.random() * 60}%`,
                }}
                variants={sparkleVariants}
                custom={index}
              />
            ))}
            
            {/* Confetti */}
            {Array.from({ length: 12 }).map((_, index) => (
              <motion.div
                key={`confetti-${index}`}
                className={`absolute w-1 h-3 ${
                  ['bg-red-400', 'bg-blue-400', 'bg-green-400', 'bg-yellow-400', 'bg-purple-400'][index % 5]
                }`}
                style={{
                  top: '-10px',
                  left: `${Math.random() * 100}%`,
                }}
                animate={{
                  y: [0, 200],
                  rotate: [0, 360],
                  opacity: [1, 0],
                }}
                transition={{
                  duration: 2,
                  delay: index * 0.1,
                  ease: 'easeOut',
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Achievement showcase component for displaying multiple badges
export interface AchievementShowcaseProps {
  achievements: Achievement[];
  title?: string;
  maxDisplay?: number;
  size?: AchievementBadgeProps['size'];
  onAchievementClick?: (achievement: Achievement) => void;
  onViewAll?: () => void;
  className?: string;
}

export const AchievementShowcase: React.FC<AchievementShowcaseProps> = ({
  achievements,
  title = 'Achievements',
  maxDisplay = 6,
  size = 'md',
  onAchievementClick,
  onViewAll,
  className = '',
}) => {
  const displayedAchievements = achievements.slice(0, maxDisplay);
  const hasMore = achievements.length > maxDisplay;

  return (
    <div className={`space-y-4 ${className}`}>
      {title && (
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h2>
          {hasMore && onViewAll && (
            <button
              onClick={onViewAll}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              View all ({achievements.length})
            </button>
          )}
        </div>
      )}
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        {displayedAchievements.map((achievement, index) => (
          <motion.div
            key={achievement.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <AchievementBadge
              achievement={achievement}
              size={size}
              onClick={onAchievementClick}
              animated={true}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AchievementBadge;
