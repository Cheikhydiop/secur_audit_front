// helper/tokenHelper.ts
export interface JwtPayload {
  [key: string]: any; // Pour les claims dynamiques, adapte selon ton token
}

/**
 * Récupère le token JWT du localStorage
 */
export function getToken(): string | null {
  return localStorage.getItem('auth_token') || localStorage.getItem('token');
}

/**
 * Décode le token JWT (payload) sans vérifier la signature.
 * Retourne null si le token est absent ou mal formé.
 */
export function decodeToken(): JwtPayload | null {
  const token = getToken();
  if (!token) return null;

  try {
    const base64Url = token.split('.')[1]; // Partie payload du token
    if (!base64Url) return null;

    // Base64Url -> Base64
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

    // Décodage Base64 en chaîne JSON
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );

    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Erreur lors du décodage du token JWT:', e);
    return null;
  }
}
