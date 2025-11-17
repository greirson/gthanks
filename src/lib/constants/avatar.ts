export const AVATAR_SIZES = {
  xs: 'h-4 w-4', // 16px - for inline/compact contexts
  sm: 'h-6 w-6', // 24px - for small lists
  md: 'h-8 w-8', // 32px - for regular lists
  lg: 'h-10 w-10', // 40px - default size
  xl: 'h-16 w-16', // 64px - for profile views
  '2xl': 'h-20 w-20', // 80px - for settings/forms
  '3xl': 'h-32 w-32', // 128px - for upload previews
} as const;

export type AvatarSize = keyof typeof AVATAR_SIZES;
