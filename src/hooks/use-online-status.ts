import { useState, useEffect, useCallback } from 'react';

/**
 * Hook pour détecter le statut réseau (online/offline)
 * Utilisé pour afficher des indicateurs visuels et adapter le comportement de l'app
 */
export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(() => navigator.onLine);
    const [isReachable, setIsReachable] = useState(true);

    const checkReachability = useCallback(async () => {
        if (!navigator.onLine) {
            setIsReachable(false);
            return;
        }

        try {
            // Simple ping to the API URL
            const apiUrl = import.meta.env.VITE_API_URL || 'https://thundering-laura-ndigueul-80527457.koyeb.app/api';
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            // Check /auth/login - lightweight & public route to test reachability
            const response = await fetch(`${apiUrl}/auth/login`, {
                method: 'HEAD',
                signal: controller.signal
            }).catch(() => null);

            clearTimeout(timeoutId);
            setIsReachable(!!response);
        } catch (e) {
            setIsReachable(false);
        }
    }, []);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            checkReachability();
        };
        const handleOffline = () => {
            setIsOnline(false);
            setIsReachable(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Periodic check every 15 seconds
        const interval = setInterval(checkReachability, 15000);

        // Initial check
        checkReachability();

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, [checkReachability]);

    return { isOnline, isReachable };
}
