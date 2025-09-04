import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

interface UsageData {
  plan: 'starter' | 'pro' | 'black_belt';
  usage: {
    blogs: {
      used: number;
      limit: number;
      percentage: number;
    };
    reviews: {
      used: number;
      limit: number;
      percentage: number;
    };
  };
  features: {
    bulkUpload: boolean;
    weeklyCalls: boolean;
    coursesAccess: boolean;
    prioritySupport: boolean;
  };
  nextResetDate: string;
}

const fetchUsage = async (): Promise<UsageData> => {
  const response = await api.get('/api/usage');
  
  if (!response.data.success) {
    throw new Error('Failed to fetch usage data');
  }
  
  return response.data.data;
};

export const useUsage = () => {
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradePromptType, setUpgradePromptType] = useState<'reviews' | 'blogs'>('reviews');

  const { data: usage, isLoading, error, refetch } = useQuery({
    queryKey: ['usage'],
    queryFn: fetchUsage,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true
  });

  // Function to check if user can add more blogs (for components to use)
  const canAddBlog = () => {
    if (!usage) return false;
    if (usage.usage.blogs.limit === -1) return true; // Unlimited
    return usage.usage.blogs.used < usage.usage.blogs.limit;
  };

  // Function to check if user can generate more reviews
  const canGenerateReview = (count: number = 1) => {
    if (!usage) return false;
    if (usage.usage.reviews.limit === -1) return true; // Unlimited
    return (usage.usage.reviews.used + count) <= usage.usage.reviews.limit;
  };

  // Function to show upgrade prompt manually
  const showUpgradePromptFor = (type: 'reviews' | 'blogs') => {
    setUpgradePromptType(type);
    setShowUpgradePrompt(true);
  };

  const isLimitReached = (type: 'reviews' | 'blogs'): boolean => {
    if (!usage) return false;
    
    const typeUsage = usage.usage[type];
    return typeUsage.limit !== -1 && typeUsage.used >= typeUsage.limit;
  };

  const getUsagePercentage = (type: 'reviews' | 'blogs'): number => {
    if (!usage) return 0;
    return usage.usage[type].percentage;
  };

  const getRemainingUsage = (type: 'reviews' | 'blogs'): number => {
    if (!usage) return 0;
    
    const typeUsage = usage.usage[type];
    if (typeUsage.limit === -1) return Infinity;
    
    return Math.max(0, typeUsage.limit - typeUsage.used);
  };

  const handleUpgradePromptClose = () => {
    setShowUpgradePrompt(false);
  };

  return {
    usage,
    isLoading,
    error,
    refetch,
    showUpgradePrompt,
    upgradePromptType,
    handleUpgradePromptClose,
    isLimitReached,
    getUsagePercentage,
    getRemainingUsage,
    canAddBlog,
    canGenerateReview,
    showUpgradePromptFor
  };
};