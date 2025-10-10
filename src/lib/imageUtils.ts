/**
 * Utility functions for handling image URLs and paths
 */

const UPLOADS_BASE_URL = 'https://webservice.sballando.it/storage';

/**
 * Converts a relative image path stored in the database to a public URL
 * @param relativePath - Path like "images/locations/{token}/logo.jpg" or "images/events/{token}/cover.jpg"
 * @returns Full public URL
 */
export function getImageUrl(relativePath: string | null | undefined): string | null {
  if (!relativePath) return null;
  
  // If it's already a full URL, return as is
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  
  // If it's a relative path, prepend the base URL
  return `${UPLOADS_BASE_URL}/${relativePath}`;
}

/**
 * Gets the location logo URL from a location object
 * @param location - Location object with logo path
 * @returns Full public URL for the logo or null
 */
export function getLocationLogoUrl(location: { logo?: string | null }): string | null {
  return getImageUrl(location.logo);
}

/**
 * Gets the event cover URL from an event object
 * @param event - Event object with cover path
 * @returns Full public URL for the cover or null
 */
export function getEventCoverUrl(event: { cover?: string | null }): string | null {
  return getImageUrl(event.cover);
}

/**
 * Creates a default fallback image URL for locations
 */
export function getLocationFallbackImage(): string {
  return '/images/location-placeholder.jpg'; // You can create this placeholder image
}

/**
 * Creates a default fallback image URL for events
 */
export function getEventFallbackImage(): string {
  return '/images/event-placeholder.jpg'; // You can create this placeholder image
}
