import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export interface Feature {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  icon?: string;
  route?: string;
  status: 'active' | 'disabled' | 'maintenance' | 'deprecated';
  maintenanceMessage?: string;
  config?: any;
}

interface FeaturesResponse {
  success: boolean;
  data: Feature[];
}

export const useFeatures = () => {
  return useQuery<Feature[]>({
    queryKey: ['features'],
    queryFn: async () => {
      const response = await api.get<FeaturesResponse>('/api/features');
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
};

export const useFeature = (code: string) => {
  const { data: features, ...rest } = useFeatures();
  
  return {
    ...rest,
    data: features?.find(f => f.code === code)
  };
};

export const useFeaturesByCategory = (category: string) => {
  const { data: features, ...rest } = useFeatures();
  
  return {
    ...rest,
    data: features?.filter(f => f.category === category) || []
  };
};

export const isFeatureActive = (features: Feature[] | undefined, code: string): boolean => {
  const feature = features?.find(f => f.code === code);
  return feature?.status === 'active';
};

export const isFeatureInMaintenance = (features: Feature[] | undefined, code: string): boolean => {
  const feature = features?.find(f => f.code === code);
  return feature?.status === 'maintenance';
};

export const getFeatureConfig = (features: Feature[] | undefined, code: string): any => {
  const feature = features?.find(f => f.code === code);
  return feature?.config || {};
};