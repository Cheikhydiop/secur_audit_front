/**
 * Geolocation utility for getting user's GPS position
 * Handles permissions and errors gracefully
 */

export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface GeoResult {
  success: boolean;
  position?: GeoPosition;
  error?: string;
}

/**
 * Get current GPS position
 * Returns null if permission denied or position unavailable
 * Does NOT block the process - returns immediately with or without position
 */
export async function getCurrentPosition(): Promise<GeoResult> {
  return new Promise((resolve) => {
    // Check if geolocation is available
    if (!navigator.geolocation) {
      resolve({
        success: false,
        error: 'Géolocalisation non supportée par ce navigateur'
      });
      return;
    }

    // Get position with high accuracy
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          success: true,
          position: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          }
        });
      },
      (error) => {
        let errorMessage = 'Position non disponible';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permission de localisation refusée';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Position non disponible';
            break;
          case error.TIMEOUT:
            errorMessage = 'Délai de localisation dépassé';
            break;
        }
        
        resolve({
          success: false,
          error: errorMessage
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000, // 10 seconds timeout
        maximumAge: 0 // Don't use cached position
      }
    );
  });
}

/**
 * Check if geolocation is available in the browser
 */
export function isGeolocationAvailable(): boolean {
  return !!navigator.geolocation;
}

/**
 * Request geolocation permission (browser will prompt user)
 * Returns permission status: 'granted', 'denied', or 'prompt'
 */
export async function requestLocationPermission(): Promise<PermissionState> {
  if (!navigator.permissions) {
    // Fallback for browsers without permissions API
    return 'prompt';
  }

  try {
    const permission = await navigator.permissions.query({ name: 'geolocation' });
    return permission.state;
  } catch {
    return 'prompt';
  }
}
