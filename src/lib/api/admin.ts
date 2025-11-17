import { z } from 'zod';

import { apiGet, apiPost } from '@/lib/api-client';
import type { AuthStatusResponse } from '@/types/auth';

// Admin API response schemas
const QueueStatusSchema = z.object({
  status: z.object({
    queueLength: z.number(),
    processing: z.boolean(),
  }),
});

const StorageStatsSchema = z.object({
  totalSize: z.string(),
  orphanedFiles: z.number(),
});

const EmailStatsSchema = z.object({
  sent: z.number(),
  failed: z.number(),
  pending: z.number(),
});

const SystemHealthSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  version: z.string(),
  uptime: z.number(),
  database: z.object({
    connected: z.boolean(),
    latency: z.number().optional(),
  }),
  email: z.object({
    configured: z.boolean(),
    working: z.boolean(),
  }),
  storage: z.object({
    available: z.boolean(),
    freeSpace: z.string().optional(),
  }),
});

const EmailConfigSchema = z.object({
  email: z.object({
    provider: z.string(),
    from: z.string(),
    configuration: z.object({
      smtp: z
        .object({
          configured: z.boolean(),
          host: z.string(),
          port: z.string(),
          user: z.string(),
          secure: z.boolean(),
        })
        .optional(),
      resend: z
        .object({
          configured: z.boolean(),
          apiKey: z.string(),
        })
        .optional(),
      console: z
        .object({
          configured: z.boolean(),
          info: z.string(),
        })
        .optional(),
    }),
  }),
});

const EmailStatusSchema = z.object({
  provider: z.string(),
  configured: z.boolean(),
  verified: z.boolean(),
  from: z.string(),
  error: z.string().optional(),
});

const EmailTestResponseSchema = z.object({
  message: z.string(),
});

// Type exports
export type QueueStatus = z.infer<typeof QueueStatusSchema>;
export type StorageStats = z.infer<typeof StorageStatsSchema>;
export type EmailStats = z.infer<typeof EmailStatsSchema>;
export type SystemHealth = z.infer<typeof SystemHealthSchema>;
export type EmailConfig = z.infer<typeof EmailConfigSchema>;
export type EmailStatus = z.infer<typeof EmailStatusSchema>;
export type EmailTestResponse = z.infer<typeof EmailTestResponseSchema>;

// Admin API client
export const adminApi = {
  // Processing queue
  getQueueStatus: async (): Promise<QueueStatus> => {
    return apiGet('/api/admin/processing-queue', QueueStatusSchema);
  },

  // Storage management
  getStorageStats: async (): Promise<StorageStats> => {
    return apiGet('/api/admin/storage/stats', StorageStatsSchema);
  },

  // Email statistics
  getEmailStats: async (): Promise<EmailStats> => {
    return apiGet('/api/admin/email/stats', EmailStatsSchema);
  },

  // System health
  getSystemHealth: async (): Promise<SystemHealth> => {
    return apiGet('/api/admin/health', SystemHealthSchema);
  },

  // Email configuration
  getEmailConfig: async (): Promise<EmailConfig> => {
    return apiGet('/api/admin/config/environment', EmailConfigSchema);
  },

  getEmailStatus: async (): Promise<EmailStatus> => {
    return apiGet('/api/admin/config/email/test', EmailStatusSchema);
  },

  sendTestEmail: async (testEmail: string): Promise<EmailTestResponse> => {
    return apiPost('/api/admin/config/email/test', { testEmail }, EmailTestResponseSchema);
  },

  // Authentication configuration
  getAuthStatus: async (): Promise<AuthStatusResponse> => {
    return apiGet('/api/admin/config/auth/status', z.any() as z.ZodSchema<AuthStatusResponse>);
  },
};
