/**
 * Format a URL to ensure it has a protocol
 */
export function formatUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  
  // If it already has a protocol, return as is
  if (trimmed.match(/^https?:\/\//)) {
    return trimmed;
  }
  
  // Add https:// if no protocol
  return `https://${trimmed}`;
}

/**
 * Format Instagram URL (accepts @username or full URL)
 */
export function formatInstagramUrl(input: string | undefined): string | undefined {
  if (!input) return undefined;
  
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  
  // If it's already a full URL
  if (trimmed.match(/^https?:\/\//)) {
    return trimmed;
  }
  
  // If it starts with @, convert to Instagram URL
  if (trimmed.startsWith('@')) {
    return `https://instagram.com/${trimmed.substring(1)}`;
  }
  
  // If it's just a username, convert to Instagram URL
  if (!trimmed.includes('/')) {
    return `https://instagram.com/${trimmed}`;
  }
  
  // Otherwise add https://
  return `https://${trimmed}`;
}

/**
 * Format WhatsApp number for wa.me link
 */
export function formatWhatsAppUrl(phone: string | undefined): string | undefined {
  if (!phone) return undefined;
  
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  if (!cleaned) return undefined;
  
  // Ensure it starts with country code (if not, assume Brazil)
  const withCountryCode = cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
  
  return `https://wa.me/${withCountryCode}`;
}

/**
 * Format YouTube URL
 */
export function formatYouTubeUrl(input: string | undefined): string | undefined {
  if (!input) return undefined;
  
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  
  // If it's already a full URL
  if (trimmed.match(/^https?:\/\//)) {
    return trimmed;
  }
  
  // If it starts with @, it's a channel handle
  if (trimmed.startsWith('@')) {
    return `https://youtube.com/${trimmed}`;
  }
  
  // Otherwise add https://
  return `https://${trimmed}`;
}

/**
 * Format Facebook URL
 */
export function formatFacebookUrl(input: string | undefined): string | undefined {
  if (!input) return undefined;
  
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  
  // If it's already a full URL
  if (trimmed.match(/^https?:\/\//)) {
    return trimmed;
  }
  
  // If it's just a username/page name
  if (!trimmed.includes('/')) {
    return `https://facebook.com/${trimmed}`;
  }
  
  // Otherwise add https://
  return `https://${trimmed}`;
}