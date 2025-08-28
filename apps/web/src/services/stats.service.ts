import api from './api';
import type { IApiResponse } from '@tatame/types';

export interface DashboardStats {
  progress: {
    total: number;
    change: string;
  };
  streak: {
    days: number;
    active: boolean;
  };
  ranking: {
    position: number;
    change: number;
    percentile: number;
  };
  studyTime: {
    total: number; // in minutes
    change: number;
  };
  completedLessons: number;
  totalLessons: number;
  belt: string;
  stripes: number;
  level: number;
  xp: number;
  nextLevelXp: number;
}

export interface Activity {
  id: string;
  userId: string;
  userName: string;
  userBelt: string;
  action: string;
  target: string;
  timestamp: Date;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: Date;
}

class StatsService {
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await api.get<IApiResponse<DashboardStats>>('/users/stats');
    return response.data.data!;
  }

  async getRecentActivities(limit: number = 10): Promise<Activity[]> {
    const response = await api.get<IApiResponse<Activity[]>>(`/activities/recent?limit=${limit}`);
    return response.data.data!;
  }

  async getAchievements(): Promise<Achievement[]> {
    const response = await api.get<IApiResponse<Achievement[]>>('/users/achievements');
    return response.data.data!;
  }

  async getLeaderboard(period: 'week' | 'month' | 'all' = 'week'): Promise<any[]> {
    const response = await api.get<IApiResponse<any[]>>(`/leaderboard?period=${period}`);
    return response.data.data!;
  }
}

export default new StatsService();