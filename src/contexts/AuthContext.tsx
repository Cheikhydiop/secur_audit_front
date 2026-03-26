import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, User } from '../services/AuthService';
import {
  saveOfflineCredentials,
  verifyOfflineCredentials,
  getOfflineSessionForToken,
  clearOfflineCredentials,
  updateOfflineToken,
} from '../services/OfflineAuthService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOfflineSession: boolean;
  token: string | null;
  login: (

    email: string,
    password: string
  ) => Promise<{
    success: boolean;
    error?: string;
    requiresDeviceVerification?: boolean;
    sessionId?: string;
    existingSessions?: any[];
    deviceInfo?: any;
    user?: User;
    token?: string;
    offlineMode?: boolean;
  }>;
  register: (
    name: string,
    email: string,
    password: string,
    phone: string,
    referralCode?: string
  ) => Promise<{ success: boolean; error?: string; userId?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOfflineSession, setIsOfflineSession] = useState(false);
  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));


  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      // ─── Cas 1 : Online → vérifier le profil côté serveur ────────────────
      if (navigator.onLine) {
        try {
          const res = await authService.getProfile();
          if (res.data) {
            setUser(res.data);
            setIsOfflineSession(false);
          } else {
            // Token invalide → chercher une session offline
            const offlineSession = getOfflineSessionForToken(token);
            if (offlineSession) {
              setUser(offlineSession.user as User);
              setIsOfflineSession(true);
            } else {
              localStorage.removeItem('auth_token');
            }
          }
        } catch {
          // Erreur réseau malgré navigator.onLine → fallback offline
          const offlineSession = getOfflineSessionForToken(token);
          if (offlineSession) {
            setUser(offlineSession.user as User);
            setIsOfflineSession(true);
          } else {
            localStorage.removeItem('auth_token');
          }
        }
      } else {
        // ─── Cas 2 : Offline → restaurer depuis le cache local ──────────────
        const offlineSession = getOfflineSessionForToken(token);
        if (offlineSession) {
          setUser(offlineSession.user as User);
          setIsOfflineSession(true);
        } else {
          // Token pas trouvé dans le cache offline → on ne peut pas restaurer
          localStorage.removeItem('auth_token');
        }
      }

      setIsLoading(false);
    };

    checkAuth();

    // Quand la connexion revient → resynchroniser silencieusement
    const handleOnline = async () => {
      if (isOfflineSession) {
        try {
          const res = await authService.getProfile();
          if (res.data) {
            setUser(res.data);
            setIsOfflineSession(false);
          }
        } catch {
          // Laisser la session offline active
        }
      }
    };

    window.addEventListener('online', handleOnline, { passive: true });
    return () => window.removeEventListener('online', handleOnline);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (email: string, password: string) => {
    // ─── Mode Online ──────────────────────────────────────────────────────────
    if (navigator.onLine) {
      const res = await authService.login(email, password);

      if (res.data?.token) {
        const userData = res.data.user;
        setUser(userData);
        setIsOfflineSession(false);
        localStorage.setItem('auth_token', res.data.token);
        setToken(res.data.token);
        if (res.data.refreshToken) {

          localStorage.setItem('refresh_token', res.data.refreshToken);
        }

        // Sauvegarder en arrière-plan pour les connexions futures offline
        saveOfflineCredentials(email, password, {
          user: userData,
          token: res.data.token,
          refreshToken: res.data.refreshToken,
        }).catch(() => { });

        return { success: true, user: userData, token: res.data.token };
      }

      if (res.data?.requiresDeviceVerification) {
        return {
          success: true,
          requiresDeviceVerification: true,
          sessionId: res.data.sessionId,
          existingSessions: res.data.existingSessions,
          deviceInfo: res.data.deviceInfo,
        };
      }

      if (res.error) {
        return { success: false, error: res.error };
      }

      return { success: false, error: 'Une erreur inconnue est survenue' };
    }

    // ─── Mode Offline ─────────────────────────────────────────────────────────
    const offlineSession = await verifyOfflineCredentials(email, password);

    if (!offlineSession) {
      return {
        success: false,
        error:
          'Identifiants incorrects ou aucune session enregistrée pour cet appareil.\n' +
          'Connectez-vous une première fois en ligne pour activer le mode hors-ligne.',
      };
    }

    // Restaurer la session offline
    setUser(offlineSession.user as User);
    setIsOfflineSession(true);
    localStorage.setItem('auth_token', offlineSession.token);
    setToken(offlineSession.token);
    if (offlineSession.refreshToken) {

      localStorage.setItem('refresh_token', offlineSession.refreshToken);
    }

    return {
      success: true,
      user: offlineSession.user as User,
      token: offlineSession.token,
      offlineMode: true,
    };
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    phone: string,
    referralCode?: string
  ) => {
    const res = await authService.register(name, email, password, phone, referralCode);
    if (res.data?.user) {
      return { success: true, userId: res.data.user.id };
    }
    return { success: false, error: res.error };
  };

  const logout = async () => {
    // Tenter un logout côté serveur si online
    if (navigator.onLine) {
      try {
        await authService.logout();
      } catch {
        // Silencieux en cas d'erreur réseau
      }
    }

    // Nettoyer les credentials offline de l'utilisateur courant
    if (user?.email) {
      clearOfflineCredentials(user.email);
    }

    setUser(null);
    setIsOfflineSession(false);
    setToken(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');

  };

  // Exposer updateOfflineToken pour que BaseService puisse le call après refresh token
  // (utile pour garder la session offline à jour après un refresh)
  useEffect(() => {
    if (user?.email) {
      const token = localStorage.getItem('auth_token');
      const refreshToken = localStorage.getItem('refresh_token') || undefined;
      if (token && !isOfflineSession) {
        updateOfflineToken(user.email, token, refreshToken);
      }
    }
  }, [user?.email, isOfflineSession]);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, isOfflineSession, token, login, register, logout }}
    >

      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
