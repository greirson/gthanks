'use client';

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface SystemLimits {
  max_wishes_per_list: number;
  max_lists_per_user: number;
  max_image_size_mb: number;
  max_description_length: number;
  max_list_name_length: number;
  virtualization_threshold: number;
}

interface SystemConfig {
  limits: SystemLimits;
  // Other config sections can be added here as needed
}

interface ConfigResponse {
  config: SystemConfig;
  lastUpdated: number | null;
}

/**
 * Hook to access public system configuration
 * Returns configuration values that affect user experience
 */
export function useSystemConfig() {
  const { data, isLoading, error } = useQuery<ConfigResponse>({
    queryKey: ['system-config', 'public'],
    queryFn: async () => {
      const response = await axios.get<ConfigResponse>('/api/config/client');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2,
  });

  return {
    config: data?.config,
    isLoading,
    error,
    // Convenience getters for commonly used values
    virtualizationThreshold: data?.config?.limits?.virtualization_threshold ?? 100,
    maxWishesPerList: data?.config?.limits?.max_wishes_per_list ?? 50,
    maxListsPerUser: data?.config?.limits?.max_lists_per_user ?? 25,
    maxImageSizeMb: data?.config?.limits?.max_image_size_mb ?? 5,
    maxDescriptionLength: data?.config?.limits?.max_description_length ?? 1000,
    maxListNameLength: data?.config?.limits?.max_list_name_length ?? 100,
  };
}

/**
 * Hook specifically for virtualization threshold
 * Provides a sensible default if config is not loaded
 */
export function useVirtualizationThreshold() {
  const { virtualizationThreshold, isLoading } = useSystemConfig();

  // Return default threshold while loading to prevent layout shifts
  return isLoading ? 100 : virtualizationThreshold;
}
