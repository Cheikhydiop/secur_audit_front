/**
 * Configuration globale de l'application frontend
 */
const apiBase = import.meta.env.VITE_API_URL || 'https://thundering-laura-ndigueul-80527457.koyeb.app/api';

const config = {
    apiUrl: apiBase.endsWith('/api') ? apiBase : `${apiBase}/api`,
    wsUrl: apiBase.replace('/api', ''),
    appName: 'G-SECU — DG/SECU Sonatel',
    version: '1.0.0',
} as const;

export default config;
