import { useQuery } from '@tanstack/react-query';
import statsService from '../services/stats.service';

export const useStats = () => {
  return useQuery({
    queryKey: ['stats'],
    queryFn: () => statsService.getDashboardStats(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useActivities = (limit?: number) => {
  return useQuery({
    queryKey: ['activities', limit],
    queryFn: () => statsService.getRecentActivities(limit),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

export const useAchievements = () => {
  return useQuery({
    queryKey: ['achievements'],
    queryFn: () => statsService.getAchievements(),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

export const useLeaderboard = (period: 'week' | 'month' | 'all' = 'week') => {
  return useQuery({
    queryKey: ['leaderboard', period],
    queryFn: () => statsService.getLeaderboard(period),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};