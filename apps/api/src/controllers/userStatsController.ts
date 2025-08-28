import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { User } from '../models/User';
import { LessonProgress } from '../models/LessonProgress';
import { Course } from '../models/Course';
import { Lesson } from '../models/Lesson';
import mongoose from 'mongoose';
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname'
    }
  }
});

// Get user statistics
export async function getUserStats(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }

    // Get user data
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        error: 'Not found',
        message: 'User not found'
      });
      return;
    }

    // Get all lesson progress for the user
    const lessonProgress = await LessonProgress.find({ 
      userId: new mongoose.Types.ObjectId(userId) 
    });

    // Calculate statistics
    const stats = {
      lessonsCompleted: lessonProgress.filter(p => p.status === 'completed').length,
      lessonsInProgress: lessonProgress.filter(p => p.status === 'in_progress').length,
      totalWatchTime: lessonProgress.reduce((sum, p) => sum + (p.totalWatchTime || 0), 0),
      averageQuizScore: calculateAverageQuizScore(lessonProgress),
      coursesStarted: new Set(lessonProgress.map(p => p.courseId.toString())).size,
      coursesCompleted: await calculateCompletedCourses(userId, lessonProgress),
      currentStreak: await calculateStreak(userId),
      totalXP: await calculateTotalXP(userId),
      rank: await calculateUserRank(userId)
    };

    // Get achievements
    const achievements = await getUserAchievements(userId, stats);

    res.json({
      success: true,
      data: {
        stats,
        achievements,
        memberSince: user.createdAt,
        lastActive: user.lastLoginAt || user.updatedAt
      }
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching user stats');
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to fetch user statistics'
    });
  }
}

// Helper functions
function calculateAverageQuizScore(progress: any[]): number {
  const quizScores = progress
    .filter(p => p.quizScore !== undefined && p.quizScore !== null)
    .map(p => p.quizScore);
  
  if (quizScores.length === 0) return 0;
  return Math.round(quizScores.reduce((sum, score) => sum + score, 0) / quizScores.length);
}

async function calculateCompletedCourses(userId: string, progress: any[]): Promise<number> {
  // Group progress by course
  const courseProgress = new Map<string, any[]>();
  progress.forEach(p => {
    const courseId = p.courseId.toString();
    if (!courseProgress.has(courseId)) {
      courseProgress.set(courseId, []);
    }
    courseProgress.get(courseId)!.push(p);
  });

  let completedCourses = 0;
  
  for (const [courseId, lessons] of courseProgress) {
    // Get total lessons in course
    const course = await Course.findById(courseId).populate('modules');
    if (!course) continue;

    const totalLessons = await Lesson.countDocuments({ 
      courseId: new mongoose.Types.ObjectId(courseId) 
    });
    
    const completedLessons = lessons.filter(l => l.status === 'completed').length;
    
    if (completedLessons === totalLessons && totalLessons > 0) {
      completedCourses++;
    }
  }

  return completedCourses;
}

async function calculateStreak(userId: string): Promise<number> {
  // Get lesson progress sorted by date
  const progress = await LessonProgress.find({ 
    userId: new mongoose.Types.ObjectId(userId),
    status: 'completed'
  }).sort({ completedAt: -1 });

  if (progress.length === 0) return 0;

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  // Check if user has activity today or yesterday
  const lastActivity = new Date(progress[0].completedAt!);
  lastActivity.setHours(0, 0, 0, 0);
  
  const daysDiff = Math.floor((currentDate.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
  
  // If last activity was more than 1 day ago, streak is broken
  if (daysDiff > 1) return 0;

  // Count consecutive days
  const uniqueDays = new Set<string>();
  progress.forEach(p => {
    if (p.completedAt) {
      const date = new Date(p.completedAt);
      uniqueDays.add(date.toISOString().split('T')[0]);
    }
  });

  const sortedDays = Array.from(uniqueDays).sort().reverse();
  
  for (let i = 0; i < sortedDays.length - 1; i++) {
    const current = new Date(sortedDays[i]);
    const next = new Date(sortedDays[i + 1]);
    const diff = Math.floor((current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak + 1; // Add 1 for the current day
}

async function calculateTotalXP(userId: string): Promise<number> {
  // Get all completed lessons
  const completedLessons = await LessonProgress.find({
    userId: new mongoose.Types.ObjectId(userId),
    status: 'completed'
  }).populate('lessonId');

  let totalXP = 0;
  
  for (const progress of completedLessons) {
    const lesson = await Lesson.findById(progress.lessonId);
    if (lesson) {
      // Base XP for completing lesson
      totalXP += lesson.xpReward || 10;
      
      // Bonus XP for quiz score
      if (progress.quizScore) {
        totalXP += Math.floor(progress.quizScore / 10);
      }
    }
  }

  return totalXP;
}

async function calculateUserRank(userId: string): Promise<number> {
  // Get all users with XP
  const allUsers = await User.find({});
  const userXPs = new Map<string, number>();

  for (const user of allUsers) {
    const xp = await calculateTotalXP(user._id.toString());
    userXPs.set(user._id.toString(), xp);
  }

  // Sort users by XP
  const sortedUsers = Array.from(userXPs.entries())
    .sort((a, b) => b[1] - a[1]);

  // Find user's rank
  const rank = sortedUsers.findIndex(([id]) => id === userId) + 1;
  
  return rank || 0;
}

async function getUserAchievements(userId: string, stats: any): Promise<any[]> {
  const achievements = [];
  const now = new Date();

  // First Lesson Achievement
  if (stats.lessonsCompleted > 0) {
    const firstLesson = await LessonProgress.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      status: 'completed'
    }).sort({ completedAt: 1 });

    if (firstLesson) {
      achievements.push({
        id: 'first_lesson',
        name: 'Primeira Aula',
        description: 'Completou sua primeira aula',
        icon: '🎯',
        color: 'bg-green-500',
        unlockedAt: firstLesson.completedAt
      });
    }
  }

  // 7 Day Streak Achievement
  if (stats.currentStreak >= 7) {
    achievements.push({
      id: 'streak_7',
      name: 'Sequência 7 Dias',
      description: 'Manteve uma sequência de 7 dias',
      icon: '🔥',
      color: 'bg-orange-500',
      unlockedAt: now
    });
  }

  // First Course Completed
  if (stats.coursesCompleted > 0) {
    achievements.push({
      id: 'first_course',
      name: 'Primeiro Curso',
      description: 'Completou seu primeiro curso',
      icon: '🏆',
      color: 'bg-purple-500',
      unlockedAt: now
    });
  }

  // 10 Lessons Milestone
  if (stats.lessonsCompleted >= 10) {
    achievements.push({
      id: 'lessons_10',
      name: '10 Aulas',
      description: 'Completou 10 aulas',
      icon: '📚',
      color: 'bg-blue-500',
      unlockedAt: now
    });
  }

  // 100 XP Milestone
  if (stats.totalXP >= 100) {
    achievements.push({
      id: 'xp_100',
      name: '100 XP',
      description: 'Ganhou 100 pontos de experiência',
      icon: '⭐',
      color: 'bg-yellow-500',
      unlockedAt: now
    });
  }

  // Top 10 Ranking
  if (stats.rank <= 10 && stats.rank > 0) {
    achievements.push({
      id: 'top_10',
      name: 'Top 10',
      description: 'Alcançou o top 10 do ranking',
      icon: '🥇',
      color: 'bg-yellow-600',
      unlockedAt: now
    });
  }

  // Quiz Master (Average > 80%)
  if (stats.averageQuizScore >= 80) {
    achievements.push({
      id: 'quiz_master',
      name: 'Mestre dos Quizzes',
      description: 'Média de 80% ou mais nos quizzes',
      icon: '🧠',
      color: 'bg-indigo-500',
      unlockedAt: now
    });
  }

  // Study Marathon (10+ hours)
  const hoursStudied = Math.floor(stats.totalWatchTime / 3600);
  if (hoursStudied >= 10) {
    achievements.push({
      id: 'marathon_10',
      name: 'Maratona de Estudos',
      description: 'Estudou por mais de 10 horas',
      icon: '⏰',
      color: 'bg-red-500',
      unlockedAt: now
    });
  }

  return achievements;
}

// Get user activity timeline
export async function getUserActivity(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { limit = 20, offset = 0 } = req.query;
    
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }

    // Get recent lesson progress
    const activities = await LessonProgress.find({
      userId: new mongoose.Types.ObjectId(userId)
    })
    .populate('lessonId', 'title')
    .populate('courseId', 'title')
    .sort({ updatedAt: -1 })
    .limit(Number(limit))
    .skip(Number(offset));

    const formattedActivities = activities.map(activity => ({
      id: activity._id,
      type: 'lesson_progress',
      status: activity.status,
      lessonTitle: (activity.lessonId as any)?.title || 'Unknown Lesson',
      courseTitle: (activity.courseId as any)?.title || 'Unknown Course',
      completedAt: activity.completedAt,
      startedAt: activity.startedAt,
      watchTime: activity.totalWatchTime,
      quizScore: activity.quizScore,
      timestamp: activity.updatedAt
    }));

    res.json({
      success: true,
      data: {
        activities: formattedActivities,
        hasMore: formattedActivities.length === Number(limit)
      }
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching user activity');
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to fetch user activity'
    });
  }
}