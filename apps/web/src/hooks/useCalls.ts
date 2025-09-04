import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { callService } from '../services/calls/service';
import toast from 'react-hot-toast';

// TEMPORARY: Inline types to isolate import issue
interface WeeklyCall {
  _id: string;
  title: string;
  description: string;
  date: string;
  duration: number;
  maxParticipants: number;
  zoomLink?: string;
  recordingLink?: string;
  topics: string[];
  status: 'upcoming' | 'live' | 'completed' | 'cancelled';
  registeredUsers: string[];
  attendedUsers: string[];
  registrationDeadline?: string;
  isRecurring: boolean;
  recurringPattern?: {
    frequency: 'weekly' | 'monthly';
    dayOfWeek?: number;
    dayOfMonth?: number;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  currentParticipants: number;
  availableSpots: number;
  isFull: boolean;
  canRegister: boolean;
}

interface CreateCallData {
  title: string;
  description: string;
  date: string;
  duration: number;
  maxParticipants: number;
  zoomLink?: string;
  recordingLink?: string;
  topics: string[];
  registrationDeadline?: string;
  isRecurring: boolean;
  recurringPattern?: {
    frequency: 'weekly' | 'monthly';
    dayOfWeek?: number;
    dayOfMonth?: number;
  };
}

// Query keys
export const callsQueryKeys = {
  all: ['calls'] as const,
  upcoming: () => [...callsQueryKeys.all, 'upcoming'] as const,
  past: () => [...callsQueryKeys.all, 'past'] as const,
  adminAll: (params?: any) => [...callsQueryKeys.all, 'admin', params] as const,
  detail: (id: string) => [...callsQueryKeys.all, 'detail', id] as const,
  participants: (id: string) => [...callsQueryKeys.all, 'participants', id] as const,
};

// Hook for upcoming calls (user view)
export const useUpcomingCalls = () => {
  return useQuery({
    queryKey: callsQueryKeys.upcoming(),
    queryFn: callService.getUpcomingCalls,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Hook for past calls (user view)
export const usePastCalls = () => {
  return useQuery({
    queryKey: callsQueryKeys.past(),
    queryFn: callService.getPastCalls,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

// Hook for single call details
export const useCall = (callId: string) => {
  return useQuery({
    queryKey: callsQueryKeys.detail(callId),
    queryFn: () => callService.getCall(callId),
    enabled: !!callId,
  });
};

// Hook for all calls (admin view)
export const useAllCalls = (params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}) => {
  return useQuery({
    queryKey: callsQueryKeys.adminAll(params),
    queryFn: () => callService.getAllCalls(params),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

// Hook for call participants (admin view)
export const useCallParticipants = (callId: string) => {
  return useQuery({
    queryKey: callsQueryKeys.participants(callId),
    queryFn: () => callService.getCallParticipants(callId),
    enabled: !!callId,
  });
};

// Hook for registering for a call
export const useRegisterForCall = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: callService.registerForCall,
    onSuccess: (_, callId) => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: callsQueryKeys.upcoming() });
      queryClient.invalidateQueries({ queryKey: callsQueryKeys.detail(callId) });
      queryClient.invalidateQueries({ queryKey: callsQueryKeys.participants(callId) });
      
      toast.success('Inscrição realizada com sucesso!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || 'Erro ao se inscrever';
      toast.error(message);
    },
  });
};

// Hook for unregistering from a call
export const useUnregisterFromCall = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: callService.unregisterFromCall,
    onSuccess: (_, callId) => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: callsQueryKeys.upcoming() });
      queryClient.invalidateQueries({ queryKey: callsQueryKeys.detail(callId) });
      queryClient.invalidateQueries({ queryKey: callsQueryKeys.participants(callId) });
      
      toast.success('Inscrição cancelada com sucesso!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || 'Erro ao cancelar inscrição';
      toast.error(message);
    },
  });
};

// Hook for creating a call (admin)
export const useCreateCall = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: callService.createCall,
    onSuccess: () => {
      // Invalidate all calls queries
      queryClient.invalidateQueries({ queryKey: callsQueryKeys.all });
      toast.success('Chamada criada com sucesso!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || 'Erro ao criar chamada';
      toast.error(message);
    },
  });
};

// Hook for updating a call (admin)
export const useUpdateCall = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ callId, data }: { callId: string; data: Partial<CreateCallData> }) =>
      callService.updateCall(callId, data),
    onSuccess: (_, { callId }) => {
      // Invalidate all calls queries and specific call
      queryClient.invalidateQueries({ queryKey: callsQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: callsQueryKeys.detail(callId) });
      toast.success('Chamada atualizada com sucesso!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || 'Erro ao atualizar chamada';
      toast.error(message);
    },
  });
};

// Hook for deleting a call (admin)
export const useDeleteCall = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: callService.deleteCall,
    onSuccess: () => {
      // Invalidate all calls queries
      queryClient.invalidateQueries({ queryKey: callsQueryKeys.all });
      toast.success('Chamada excluída com sucesso!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || 'Erro ao excluir chamada';
      toast.error(message);
    },
  });
};

// Hook for updating recording link (admin)
export const useUpdateRecording = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ callId, recordingLink }: { callId: string; recordingLink: string }) =>
      callService.updateRecording(callId, recordingLink),
    onSuccess: (_, { callId }) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: callsQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: callsQueryKeys.detail(callId) });
      toast.success('Link de gravação atualizado!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || 'Erro ao atualizar gravação';
      toast.error(message);
    },
  });
};