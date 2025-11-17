import { z } from 'zod';

/**
 * @swagger
 * components:
 *   schemas:
 *     Group:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The unique identifier for the group
 *         name:
 *           type: string
 *           description: The name of the group
 *         description:
 *           type: string
 *           nullable: true
 *           description: Group description
 *         avatarUrl:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: URL of the group avatar image
 *         visibility:
 *           type: string
 *           enum: [private]
 *           description: Visibility level - always private (groups are invitation-based)
 *         ownerId:
 *           type: string
 *           description: ID of the user who created the group
 *         memberCount:
 *           type: integer
 *           description: Number of members in the group
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the group was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the group was last updated
 *       required:
 *         - id
 *         - name
 *         - visibility
 *         - ownerId
 *         - memberCount
 *         - createdAt
 *         - updatedAt
 *     GroupCreate:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *           description: The name of the group
 *         description:
 *           type: string
 *           maxLength: 500
 *           nullable: true
 *           description: Description of the group
 *         avatarUrl:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: URL of the group avatar image
 *         visibility:
 *           type: string
 *           enum: [private]
 *           default: private
 *           description: Visibility level - always private (groups are invitation-based)
 *       required:
 *         - name
 *     GroupUpdate:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *           description: The name of the group
 *         description:
 *           type: string
 *           maxLength: 500
 *           nullable: true
 *           description: Description of the group
 *         avatarUrl:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: URL of the group avatar image
 *         visibility:
 *           type: string
 *           enum: [private]
 *           description: Visibility level - always private (groups are invitation-based)
 */

// Group creation schema
export const GroupCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Group name is required')
    .max(100, 'Group name must be less than 100 characters'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .nullable(),
  avatarUrl: z
    .string()
    .refine(
      (val) => {
        if (!val) {
          return true;
        }
        // Accept regular URLs
        if (val.startsWith('http://') || val.startsWith('https://')) {
          return true;
        }
        // Accept data URLs (base64 images)
        if (val.startsWith('data:image/')) {
          return true;
        }
        // Accept API endpoint paths
        if (val.startsWith('/api/')) {
          return true;
        }
        return false;
      },
      { message: 'Must be a valid URL, data URL, or API path' }
    )
    .optional()
    .nullable(),
  // Visibility is always private - field kept for backward compatibility but ignored
  visibility: z.literal('private').default('private').optional(),
});

// Group update schema
export const GroupUpdateSchema = GroupCreateSchema.partial();

// Group invitation schema
export const GroupInviteSchema = z.object({
  emails: z
    .array(z.string().email('Invalid email address'))
    .min(1, 'At least one email is required')
    .max(50, 'Maximum 50 invitations at once'),
});

// Member management schema
export const GroupMemberSchema = z.object({
  userId: z.string(),
  role: z.enum(['member', 'admin']).default('member'),
});

// Add member schema (supports email or userId)
export const GroupAddMemberSchema = z
  .object({
    userId: z.string().optional(),
    email: z.string().email('Invalid email address').optional(),
    role: z.enum(['member', 'admin']).default('member'),
  })
  .refine((data) => data.userId || data.email, {
    message: 'Either userId or email must be provided',
  });

// Update member role schema
export const GroupUpdateMemberRoleSchema = z.object({
  role: z.enum(['member', 'admin']),
});

// Share lists with group schema
export const GroupShareListsSchema = z.object({
  listIds: z
    .array(z.string())
    .min(1, 'At least one list required')
    .max(100, 'Maximum 100 lists at once'),
});

// Type exports
export type GroupCreateInput = z.infer<typeof GroupCreateSchema>;
export type GroupUpdateInput = z.infer<typeof GroupUpdateSchema>;
export type GroupInviteInput = z.infer<typeof GroupInviteSchema>;
export type GroupMemberInput = z.infer<typeof GroupMemberSchema>;
export type GroupAddMemberInput = z.infer<typeof GroupAddMemberSchema>;
export type GroupShareListsInput = z.infer<typeof GroupShareListsSchema>;
