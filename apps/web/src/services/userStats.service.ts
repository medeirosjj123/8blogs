import api from './api';
import type { IApiResponse } from '@tatame/types';

export interface UserStats {
  lessonsCompleted: number;
  lessonsInProgress: number;
  totalWatchTime: number;
  averageQuizScore: number;
  coursesStarted: number;
  coursesCompleted: number;
  currentStreak: number;
  totalXP: number;
  rank: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  unlockedAt: Date;
}

export interface UserActivity {
  id: string;
  type: string;
  status: string;
  lessonTitle: string;
  courseTitle: string;
  completedAt?: Date;
  startedAt?: Date;
  watchTime?: number;
  quizScore?: number;
  timestamp: Date;
}

class UserStatsService {
  async getStats(): Promise<{ stats: UserStats; achievements: Achievement[]; memberSince: Date; lastActive: Date }> {
    const response = await api.get<IApiResponse<any>>('/user/stats');
    return response.data.data!;
  }

  async getActivity(limit = 20, offset = 0): Promise<{ activities: UserActivity[]; hasMore: boolean }> {
    const response = await api.get<IApiResponse<any>>(
      `/user/activity?limit=${limit}&offset=${offset}`
    );
    return response.data.data!;
  }

  async uploadAvatar(file: File): Promise<{ avatar: string; user: any }> {
    const formData = new FormData();
    formData.append('avatar', file);
    
    const response = await api.post<IApiResponse<{ avatar: string; user: any }>>('/auth/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data.data!;
  }

  async deleteAvatar(): Promise<void> {
    await api.delete('/auth/avatar');
  }
}

export default new UserStatsService();