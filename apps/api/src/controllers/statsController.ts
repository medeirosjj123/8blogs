import { Request, Response } from 'express';
import { User } from '../models/User';
import { LessonProgress } from '../models/LessonProgress';
import { Course } from '../models/Course';
import { Module } from '../models/Module';
import { Lesson } from '../models/Lesson';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    // Get lesson progress
    const progress = await LessonProgress.find({ userId, status: 'completed' });
    const totalLessons = await Lesson.countDocuments({ isPublished: true });
    const completedLessons = progress.length;
    const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    // Calculate streak (simplified - in production, track daily activity)
    const lastActivity = user.lastLoginAt || user.createdAt;
    const daysSinceLastActivity = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
    const hasStreak = daysSinceLastActivity <= 1;
    const streakDays = hasStreak ? (user as any).streak || 7 : 0; // Mock data for now

    // Mock ranking data (in production, calculate from database)
    const totalUsers = await User.countDocuments();
    const userRank = Math.floor(Math.random() * 50) + 1; // Mock rank
    const percentile = Math.round((1 - (userRank / totalUsers)) * 100);

    // Calculate study time (in production, track actual video watch time)
    const studyTimeMinutes = completedLessons * 30; // Assume 30 min per lesson average

    // Belt system based on progress
    let belt = 'branca';
    let stripes = 0;
    if (progressPercentage >= 80) {
      belt = 'preta';
      stripes = 0;
    } else if (progressPercentage >= 60) {
      belt = 'marrom';
      stripes = Math.floor((progressPercentage - 60) / 5);
    } else if (progressPercentage >= 40) {
      belt = 'roxa';
      stripes = Math.floor((progressPercentage - 40) / 5);
    } else if (progressPercentage >= 20) {
      belt = 'azul';
      stripes = Math.floor((progressPercentage - 20) / 5);
    } else {
      belt = 'branca';
      stripes = Math.floor(progressPercentage / 5);
    }

    // XP system
    const level = Math.floor(completedLessons / 5) + 1;
    const xp = (completedLessons * 100) % 500;
    const nextLevelXp = 500;

    const stats = {
      progress: {
        total: progressPercentage,
        change: '+15%' // Mock change
      },
      streak: {
        days: streakDays,
        active: hasStreak
      },
      ranking: {
        position: userRank,
        change: 3, // Mock change
        percentile
      },
      studyTime: {
        total: studyTimeMinutes,
        change: 120 // Mock change in minutes
      },
      completedLessons,
      totalLessons,
      belt,
      stripes: Math.min(stripes, 4),
      level,
      xp,
      nextLevelXp
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get stats' }
    });
  }
};

export const getRecentActivities = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Mock activities (in production, track real activities)
    const activities = [
      {
        id: '1',
        userId: '1',
        userName: 'João Silva',
        userBelt: 'azul',
        action: 'completou',
        target: 'Módulo 3 - SEO On-Page',
        timestamp: new Date(Date.now() - 1000 * 60 * 2) // 2 min ago
      },
      {
        id: '2',
        userId: '2',
        userName: 'Maria Santos',
        userBelt: 'roxa',
        action: 'iniciou',
        target: 'WordPress Performance',
        timestamp: new Date(Date.now() - 1000 * 60 * 15) // 15 min ago
      },
      {
        id: '3',
        userId: '3',
        userName: 'Pedro Costa',
        userBelt: 'marrom',
        action: 'subiu para',
        target: '#10 no Ranking',
        timestamp: new Date(Date.now() - 1000 * 60 * 60) // 1h ago
      },
      {
        id: '4',
        userId: '4',
        userName: 'Ana Lima',
        userBelt: 'azul',
        action: 'conquistou',
        target: 'Badge Expert SEO',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) // 2h ago
      }
    ].slice(0, limit);

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get activities' }
    });
  }
};

export const getAchievements = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    
    // Mock achievements (in production, track real achievements)
    const achievements = [
      {
        id: '1',
        name: 'Primeira Aula',
        description: 'Complete sua primeira aula',
        icon: '🌱',
        unlocked: true,
        unlockedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7) // 7 days ago
      },
      {
        id: '2',
        name: 'Sequência 7 Dias',
        description: 'Estude por 7 dias seguidos',
        icon: '🔥',
        unlocked: true,
        unlockedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3) // 3 days ago
      },
      {
        id: '3',
        name: 'Faixa Azul',
        description: 'Alcance a faixa azul',
        icon: '💙',
        unlocked: true,
        unlockedAt: new Date(Date.now() - 1000 * 60 * 60 * 24) // 1 day ago
      },
      {
        id: '4',
        name: 'Mestre SEO',
        description: 'Complete todos os módulos de SEO',
        icon: '👑',
        unlocked: false
      },
      {
        id: '5',
        name: 'Sensei',
        description: 'Alcance a faixa preta',
        icon: '🌸',
        unlocked: false
      }
    ];

    res.json({
      success: true,
      data: achievements
    });
  } catch (error) {
    console.error('Get achievements error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get achievements' }
    });
  }
};

export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    const period = req.query.period as string || 'week';
    
    // Mock leaderboard (in production, calculate from real data)
    const leaderboard = [
      {
        rank: 1,
        userId: '1',
        name: 'Carlos Mendes',
        belt: 'preta',
        xp: 4500,
        avatar: null
      },
      {
        rank: 2,
        userId: '2',
        name: 'Ana Costa',
        belt: 'marrom',
        xp: 3800,
        avatar: null
      },
      {
        rank: 3,
        userId: '3',
        name: 'Roberto Lima',
        belt: 'marrom',
        xp: 3600,
        avatar: null
      },
      {
        rank: 4,
        userId: '4',
        name: 'Juliana Santos',
        belt: 'roxa',
        xp: 3200,
        avatar: null
      },
      {
        rank: 5,
        userId: '5',
        name: 'Pedro Oliveira',
        belt: 'roxa',
        xp: 2900,
        avatar: null
      }
    ];

    res.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get leaderboard' }
    });
  }
};