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
      
      console.log('📡 [JOB-STATUS-HOOK] Fetching job status for:', jobId);
      
      const response = await api.get(`/api/reviews/jobs/${jobId}`);
      const jobData = response.data.data as JobData;
      
      console.log('📊 [JOB-STATUS-HOOK] Job status update received:', {
        jobId,
        status: jobData?.status,
        progress: jobData?.progress,
        currentStep: jobData?.currentStep,
        isCompleted: jobData?.status === 'completed',
        rawResponse: response.data // Add full response for debugging
      });
      
      return jobData;
    },
    enabled: enabled && !!jobId,
    refetchOnWindowFocus: false,
    refetchInterval: (data) => {
      // Stop polling if job is finished
      if (data && (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled')) {
        console.log('🛑 [JOB-STATUS-HOOK] Job finished, stopping polling:', data.status);
        setIsPolling(false);
        return false;
      }
      
      // Only poll when isPolling is true
      const shouldPoll = isPolling && enabled && !!jobId;
      console.log('🔄 [JOB-STATUS-HOOK] Refetch interval decision:', {
        shouldPoll,
        isPolling,
        enabled,
        jobId,
        interval: shouldPoll ? pollInterval : false
      });
      
      return shouldPoll ? pollInterval : false;
    },
    retry: (failureCount, error: any) => {
      console.warn('❌ [JOB-STATUS-HOOK] Query error:', {
        jobId,
        failureCount,
        status: error?.response?.status,
        message: error?.message
      });
      // Retry on network errors but not on 404s (job not found)
      if (error?.response?.status === 404) return false;
      return failureCount < 3;
    }
  });

  // Handle job status changes
  useEffect(() => {
    if (!query.data) {
      console.log('🚫 [JOB-STATUS-HOOK] No query data available for status change handling');
      return;
    }

    const currentStatus = query.data.status;
    
    console.log('📈 [JOB-STATUS-HOOK] Processing status update:', {
      currentStatus,
      previousStatus,
      progress: query.data.progress,
      statusChanged: previousStatus !== currentStatus
    });
    
    // Only trigger status-specific callbacks when status actually changes
    if (previousStatus !== currentStatus) {
      setPreviousStatus(currentStatus);
      
      if (currentStatus === 'completed') {
        console.log('✅ [JOB-STATUS-HOOK] Job completed, calling onComplete callback');
        setIsPolling(false);
        onComplete?.(query.data);
      } else if (currentStatus === 'failed' || currentStatus === 'cancelled') {
        console.log('❌ [JOB-STATUS-HOOK] Job failed/cancelled, calling onError callback');
        setIsPolling(false);
        onError?.(query.data.error || new Error(`Job ${currentStatus}`));
      } else if (currentStatus === 'processing') {
        console.log('🔄 [JOB-STATUS-HOOK] Job processing, calling onProgress callback');
        onProgress?.(query.data);
      }
    }

    // Always call onProgress for processing jobs (even within same status) to update progress
    if (currentStatus === 'processing' || currentStatus === 'queued') {
      console.log('📊 [JOB-STATUS-HOOK] Calling onProgress for current job state');
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
    console.log('🚀 [JOB-STATUS-HOOK] Starting polling for job:', {
      jobId,
      currentStatus: query.data?.status,
      hasJobId: !!jobId,
      enabled,
      currentlyPolling: isPolling
    });
    
    if (jobId) {
      setIsPolling(true);
      // Also trigger an immediate refetch when starting polling
      console.log('🔄 [JOB-STATUS-HOOK] Triggering immediate refetch on polling start');
      query.refetch();
    } else {
      console.warn('⚠️ [JOB-STATUS-HOOK] Cannot start polling - no job ID provided');
    }
  }, [jobId, query.data, query.refetch, enabled, isPolling]);

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