import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import userStatsService from '../services/userStats.service';
import authService from '../services/auth.service';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export const useUserStats = () => {
  return useQuery({
    queryKey: ['userStats'],
    queryFn: () => userStatsService.getStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useUserActivity = (limit = 20, offset = 0) => {
  return useQuery({
    queryKey: ['userActivity', limit, offset],
    queryFn: () => userStatsService.getActivity(limit, offset),
  });
};

export const useAvatarUpload = () => {
  const queryClient = useQueryClient();
  const { setUserData, user } = useAuth();
  
  return useMutation({
    mutationFn: (file: File) => userStatsService.uploadAvatar(file),
    onSuccess: (data) => {
      // Update user in auth context
      if (data.user) {
        setUserData(data.user);
      } else if (data.avatar) {
        // If only avatar URL is returned, update the current user
        setUserData({ ...user!, avatar: data.avatar });
      }
      
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success('Avatar atualizado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar avatar');
    }
  });
};

export const useDeleteAvatar = () => {
  const queryClient = useQueryClient();
  const { user, setUserData } = useAuth();
  
  return useMutation({
    mutationFn: () => userStatsService.deleteAvatar(),
    onSuccess: () => {
      // Update user in auth context to remove avatar
      if (user) {
        setUserData({ ...user, avatar: undefined });
      }
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success('Avatar removido com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao remover avatar');
    }
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { setUserData } = useAuth();
  
  return useMutation({
    mutationFn: (data: {
      name?: string;
      bio?: string;
      location?: string;
      socialLinks?: {
        facebook?: string;
        instagram?: string;
        whatsapp?: string;
        youtube?: string;
        website?: string;
      };
    }) => authService.updateProfile(data),
    onSuccess: (response) => {
      // Update user in auth context immediately
      if (response.data) {
        setUserData(response.data);
      }
      
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success('Perfil atualizado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar perfil');
    }
  });
};