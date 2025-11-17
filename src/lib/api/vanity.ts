import { apiPut } from '@/lib/api-client';
import { z } from 'zod';

const userResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string().nullable(),
    username: z.string().nullable(),
    showPublicProfile: z.boolean(),
    canUseVanityUrls: z.boolean(),
  }),
});

const listResponseSchema = z.object({
  list: z.object({
    id: z.string(),
    slug: z.string().nullable(),
  }),
});

export const vanityApi = {
  /**
   * Set username for the current user (one-time only)
   */
  setUsername: async (username: string) => {
    return apiPut('/api/user/username', { username }, userResponseSchema);
  },

  /**
   * Toggle profile visibility setting
   */
  setProfileVisibility: async (showPublicProfile: boolean) => {
    return apiPut('/api/user/profile-settings', { showPublicProfile }, userResponseSchema);
  },

  /**
   * Set or update a list's slug
   */
  setListSlug: async (listId: string, slug: string) => {
    return apiPut(`/api/lists/${listId}/slug`, { slug }, listResponseSchema);
  },
};
