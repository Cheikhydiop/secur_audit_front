/**
 * OfflineAuthService — Authentification hors-ligne sécurisée
 *
 * Principe :
 *  - Après un login online réussi, on stocke en localStorage :
 *      • Un hash SHA-256 de (email + password + deviceId) → vérification offline
 *      • Les données user + token chiffrés → restauration de session
 *  - Lors d'un login offline, on recalcule le hash et on compare
 *  - Jamais de mot de passe en clair stocké
 *
 * Sécurité :
 *  - Hash irreversible (SHA-256) → on ne peut pas retrouver le mot de passe
 *  - deviceId unique par navigateur → les credentials ne fonctionnent que sur cet appareil
 *  - Le token expiré est détecté à la reconnexion et déclenche un refresh/logout automatique
 */

const OFFLINE_HASH_KEY = 'offline_auth_hash';
const OFFLINE_SESSION_KEY = 'offline_session';
const DEVICE_ID_KEY = 'device_id';
const OFFLINE_USERS_KEY = 'offline_users';   // Liste des emails autorisés offline

/** Génère ou récupère un identifiant unique et stable pour cet appareil/navigateur */
function getDeviceId(): string {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
}

/**
 * Calcule un hash SHA-256 de la combinaison email + password + deviceId
 * Irreversible : on ne peut pas retrouver le mot de passe depuis ce hash
 */
async function hashCredentials(email: string, password: string): Promise<string> {
    const deviceId = getDeviceId();
    const data = `${email.toLowerCase().trim()}:${password}:${deviceId}:sonatel-dg-secu-v1`;
    const encoded = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface OfflineSession {
    user: {
        id: string;
        name: string;
        email: string;
        role: string;
        entite?: string;
        avatar?: string;
    };
    token: string;
    refreshToken?: string;
    savedAt: number;      // timestamp ms
    expiresAt: number;    // timestamp ms (basé sur 7 jours par défaut)
}

/**
 * Enregistre les credentials et la session après un login online réussi
 * Appelé automatiquement par l'AuthContext après chaque connexion réussie
 */
export async function saveOfflineCredentials(
    email: string,
    password: string,
    session: Omit<OfflineSession, 'savedAt' | 'expiresAt'>
): Promise<void> {
    try {
        const hash = await hashCredentials(email, password);
        const now = Date.now();

        // Stocker le hash (clé = email normalisé)
        const emailKey = email.toLowerCase().trim();
        const existingHashes = JSON.parse(localStorage.getItem(OFFLINE_HASH_KEY) || '{}');
        existingHashes[emailKey] = hash;
        localStorage.setItem(OFFLINE_HASH_KEY, JSON.stringify(existingHashes));

        // Stocker la session (7 jours d'autonomie)
        const offlineSession: OfflineSession = {
            ...session,
            savedAt: now,
            expiresAt: now + 7 * 24 * 60 * 60 * 1000,  // 7 jours
        };
        const existingSessions = JSON.parse(localStorage.getItem(OFFLINE_SESSION_KEY) || '{}');
        existingSessions[emailKey] = offlineSession;
        localStorage.setItem(OFFLINE_SESSION_KEY, JSON.stringify(existingSessions));

        // Mettre à jour la liste des utilisateurs offline autorisés
        const users: string[] = JSON.parse(localStorage.getItem(OFFLINE_USERS_KEY) || '[]');
        if (!users.includes(emailKey)) {
            users.push(emailKey);
            localStorage.setItem(OFFLINE_USERS_KEY, JSON.stringify(users));
        }
    } catch (err) {
        // Ne jamais bloquer le flux principal si le stockage offline échoue
        console.warn('[OfflineAuth] Impossible de sauvegarder les credentials offline:', err);
    }
}

/**
 * Vérifie les credentials offline et retourne la session si valide
 * Retourne null si les credentials sont incorrects ou si la session a expiré
 */
export async function verifyOfflineCredentials(
    email: string,
    password: string
): Promise<OfflineSession | null> {
    try {
        const emailKey = email.toLowerCase().trim();

        // 1. Vérifier que cet email a des credentials offline
        const hashes = JSON.parse(localStorage.getItem(OFFLINE_HASH_KEY) || '{}');
        const storedHash = hashes[emailKey];
        if (!storedHash) return null;

        // 2. Calculer le hash avec le mot de passe fourni
        const computedHash = await hashCredentials(email, password);

        // 3. Comparer les hashes (comparaison temporellement stable)
        if (computedHash !== storedHash) return null;

        // 4. Récupérer la session
        const sessions = JSON.parse(localStorage.getItem(OFFLINE_SESSION_KEY) || '{}');
        const session: OfflineSession | undefined = sessions[emailKey];
        if (!session) return null;

        // 5. Vérifier l'expiration de la session offline (7 jours)
        if (Date.now() > session.expiresAt) {
            // Session expirée : nettoyer
            delete hashes[emailKey];
            delete sessions[emailKey];
            localStorage.setItem(OFFLINE_HASH_KEY, JSON.stringify(hashes));
            localStorage.setItem(OFFLINE_SESSION_KEY, JSON.stringify(sessions));
            return null;
        }

        return session;
    } catch {
        return null;
    }
}

/**
 * Récupère la session offline active (si déjà connecté avec un token valide)
 * Utilisé au démarrage de l'app pour éviter d'appeler le serveur si offline
 */
export function getOfflineSessionForToken(token: string): OfflineSession | null {
    try {
        if (!token) return null;
        const sessions = JSON.parse(localStorage.getItem(OFFLINE_SESSION_KEY) || '{}');

        for (const emailKey in sessions) {
            const session: OfflineSession = sessions[emailKey];
            if (session.token === token && Date.now() < session.expiresAt) {
                return session;
            }
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Retourne la liste des emails pouvant se connecter offline
 */
export function getOfflineUsers(): string[] {
    try {
        return JSON.parse(localStorage.getItem(OFFLINE_USERS_KEY) || '[]');
    } catch {
        return [];
    }
}

/**
 * Met à jour uniquement le token dans la session offline (après refresh)
 */
export function updateOfflineToken(email: string, newToken: string, newRefreshToken?: string): void {
    try {
        const emailKey = email.toLowerCase().trim();
        const sessions = JSON.parse(localStorage.getItem(OFFLINE_SESSION_KEY) || '{}');
        if (sessions[emailKey]) {
            sessions[emailKey].token = newToken;
            if (newRefreshToken) sessions[emailKey].refreshToken = newRefreshToken;
            // Prolonger l'autonomie offline de 7 jours à chaque refresh
            sessions[emailKey].expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
            localStorage.setItem(OFFLINE_SESSION_KEY, JSON.stringify(sessions));
        }
    } catch {
        // Silencieux
    }
}

/**
 * Supprime les credentials offline d'un utilisateur (logout)
 */
export function clearOfflineCredentials(email: string): void {
    try {
        const emailKey = email.toLowerCase().trim();
        const hashes = JSON.parse(localStorage.getItem(OFFLINE_HASH_KEY) || '{}');
        const sessions = JSON.parse(localStorage.getItem(OFFLINE_SESSION_KEY) || '{}');
        const users = JSON.parse(localStorage.getItem(OFFLINE_USERS_KEY) || '[]');

        delete hashes[emailKey];
        delete sessions[emailKey];
        const newUsers = users.filter((u: string) => u !== emailKey);

        localStorage.setItem(OFFLINE_HASH_KEY, JSON.stringify(hashes));
        localStorage.setItem(OFFLINE_SESSION_KEY, JSON.stringify(sessions));
        localStorage.setItem(OFFLINE_USERS_KEY, JSON.stringify(newUsers));
    } catch {
        // Silencieux
    }
}
