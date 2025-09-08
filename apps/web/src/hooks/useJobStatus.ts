import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

interface JobProgress {
  current: number;
  total: number;
  percentage: number;
}

interface JobResult {
  reviewId?: string;
  title: string;
  status: 'success' | 'failed';
  error?: string;
  wordpressUrl?: string;
  generatedAt: string;
}

interface JobStats {
  totalReviews: number;
  successfulReviews: number;
  failedReviews: number;
  totalTokensUsed: number;
  totalCost: number;
  totalGenerationTime: number;
}

interface JobData {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: JobProgress;
  currentStep?: string;
  results: {
    completed: JobResult[];
    stats: JobStats;
  };
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
  queuedAt: string;
  startedAt?: string;
  completedAt?: string;
}

interface UseJobStatusOptions {
  jobId: string | null;
  enabled?: boolean;
  onComplete?: (job: JobData) => void;
  onProgress?: (job: JobData) => void;
  onError?: (error: any) => void;
  pollInterval?: number; // in milliseconds
}

interface UseJobStatusReturn {
  job: JobData | null;
  isLoading: boolean;
  error: any;
  isPolling: boolean;
  startPolling: () => void;
  stopPolling: () => void;
  refetch: () => void;
}

export const useJobStatus = (options: UseJobStatusOptions): UseJobStatusReturn => {
  const {
    jobId,
    enabled = true,
    onComplete,
    onProgress,
    onError,
    pollInterval = 2000 // Poll every 2 seconds
  } = options;

  const [isPolling, setIsPolling] = useState(false);
  const [previousStatus, setPreviousStatus] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['job-status', jobId],
    queryFn: async () => {
      if (!jobId) return null;
      
      const response = await api.get(`/api/reviews/jobs/${jobId}`);
      return response.data.data as JobData;
    },
    enabled: enabled && !!jobId,
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      // Retry on network errors but not on 404s (job not found)
      if (error?.response?.status === 404) return false;
      return failureCount < 3;
    }
  });

  // Handle polling with useEffect instead of refetchInterval
  useEffect(() => {
    if (!isPolling || !query.data || !jobId) return;
    
    const isFinished = query.data.status === 'completed' || query.data.status === 'failed' || query.data.status === 'cancelled';
    if (isFinished) {
      setIsPolling(false);
      return;
    }

    const interval = setInterval(() => {
      query.refetch();
    }, pollInterval);

    return () => clearInterval(interval);
  }, [isPolling, query.data?.status, jobId, pollInterval, query.refetch]);

  // Handle job status changes
  useEffect(() => {
    if (!query.data) return;

    const currentStatus = query.data.status;
    
    // Only trigger callbacks when status actually changes
    if (previousStatus !== currentStatus) {
      setPreviousStatus(currentStatus);
      
      if (currentStatus === 'completed') {
        setIsPolling(false);
        onComplete?.(query.data);
      } else if (currentStatus === 'failed' || currentStatus === 'cancelled') {
        setIsPolling(false);
        onError?.(query.data.error || new Error(`Job ${currentStatus}`));
      } else if (currentStatus === 'processing') {
        onProgress?.(query.data);
      }
    }

    // Also call onProgress when progress changes (even within same status)
    if (currentStatus === 'processing') {
      onProgress?.(query.data);
    }
  }, [query.data, previousStatus, onComplete, onProgress, onError]);

  // Handle query errors
  useEffect(() => {
    if (query.error) {
      setIsPolling(false);
      onError?.(query.error);
    }
  }, [query.error, onError]);

  const startPolling = useCallback(() => {
    if (jobId && query.data && !['completed', 'failed', 'cancelled'].includes(query.data.status)) {
      setIsPolling(true);
    }
  }, [jobId, query.data]);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
  }, []);

  const refetch = useCallback(() => {
    query.refetch();
  }, [query]);

  return {
    job: query.data || null,
    isLoading: query.isLoading,
    error: query.error,
    isPolling,
    startPolling,
    stopPolling,
    refetch
  };
};

// Helper hook to get user's recent jobs
export const useUserJobs = (limit: number = 10) => {
  return useQuery({
    queryKey: ['user-jobs', limit],
    queryFn: async () => {
      const response = await api.get(`/api/reviews/jobs?limit=${limit}`);
      return response.data.data.jobs;
    },
    refetchOnWindowFocus: false
  });
};