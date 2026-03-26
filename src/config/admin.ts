
// Configuration pour l'URL d'administration
// Permet de sécuriser l'accès en changeant le chemin par défaut via une variable d'environnement

// Récupération de l'URL depuis les variables d'environnement, ou par défaut '/admin'
// Pour changer l'URL, ajoutez VITE_ADMIN_PATH=/votre-url-secrete dans le fichier .env
export const ADMIN_PATH = import.meta.env.VITE_ADMIN_PATH || '/admin';

// Fonction utilitaire pour construire des URLs admin complètes
export const getAdminUrl = (path: string = '') => {
    // Enlever le slash initial s'il existe pour éviter le double slash
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${ADMIN_PATH}${cleanPath ? '/' + cleanPath : ''}`;
};
