import { useQuery } from '@tanstack/react-query';
import chatService from '../services/chat.service';

export interface MentionUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isOnline: boolean;
}

export const useMentionUsers = () => {
  return useQuery<MentionUser[]>({
    queryKey: ['mention-users'],
    queryFn: () => chatService.getAvailableUsers(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};