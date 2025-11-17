/**
 * Resolves avatar display URL from user data
 * Handles both regular URLs and base64 data URLs
 */
export function resolveAvatarUrl(user: { avatarUrl?: string | null; id: string }): string | null {
  // If avatarUrl is a base64 data URL, return the API endpoint
  if (user.avatarUrl?.startsWith('data:image')) {
    return `/api/user/avatar/${user.id}`;
  }

  // If avatarUrl is a regular URL, use it directly
  if (user.avatarUrl) {
    return user.avatarUrl;
  }

  return null;
}

/**
 * Resolves avatar URL synchronously
 * Use this when you have the user object
 */
export function resolveAvatarUrlSync(user: {
  avatarUrl?: string | null;
  id: string;
}): string | null {
  // If avatarUrl is a base64 data URL, return the API endpoint
  if (user.avatarUrl?.startsWith('data:image')) {
    return `/api/user/avatar/${user.id}`;
  }

  // If avatarUrl is a regular URL, use it directly
  if (user.avatarUrl) {
    return user.avatarUrl;
  }

  return null;
}

/**
 * Resolves group avatar URL synchronously
 * Use this when you have the group object
 */
export function resolveGroupAvatarUrlSync(group: {
  avatarUrl?: string | null;
  id: string;
}): string | null {
  // If avatarUrl is a base64 data URL, return the API endpoint
  if (group.avatarUrl?.startsWith('data:image')) {
    return `/api/groups/${group.id}/avatar`;
  }

  // If avatarUrl is a regular URL, use it directly
  if (group.avatarUrl) {
    return group.avatarUrl;
  }

  return null;
}
