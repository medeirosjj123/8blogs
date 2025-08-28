/**
 * Get the full URL for an avatar image
 * Handles both relative paths from our API and external URLs
 */
export function getAvatarUrl(avatar: string | null | undefined): string | undefined {
  if (!avatar) return undefined;
  
  // If it's a relative path (starts with /), prepend the API URL
  if (avatar.startsWith('/')) {
    const apiUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';
    return `${apiUrl}${avatar}`;
  }
  
  // Otherwise assume it's a full URL (external avatar, etc)
  return avatar;
}

/**
 * Get initials from a name for avatar placeholder
 */
export function getInitials(name: string | undefined | null): string {
  if (!name) return '?';
  
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  
  return name[0].toUpperCase();
}