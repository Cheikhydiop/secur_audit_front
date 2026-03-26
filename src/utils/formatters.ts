import { useTranslation } from 'react-i18next';
import { format, formatDistance, formatRelative } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

/**
 * Hook pour formater les montants en FCFA selon la langue
 */
export function useFormatCurrency() {
    const { i18n } = useTranslation();

    return (amount: number): string => {
        // Format selon la locale
        const formatted = new Intl.NumberFormat(i18n.language, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);

        return `${formatted} FCFA`;
    };
}

/**
 * Hook pour formater les dates selon la langue
 */
export function useFormatDate() {
    const { i18n } = useTranslation();

    const locales: Record<string, Locale> = {
        fr: fr,
        en: enUS,
        wo: fr, // Wolof utilise le format français par défaut
    };

    const currentLocale = locales[i18n.language] || fr;

    return {
        /**
         * Formate une date selon le pattern fourni
         * @param date - Date à formater
         * @param formatStr - Pattern de format (ex: 'dd MMMM yyyy', 'PPP')
         */
        format: (date: Date | string, formatStr = 'PPP'): string => {
            return format(new Date(date), formatStr, { locale: currentLocale });
        },

        /**
         * Affiche la distance relative (ex: "il y a 2 heures")
         * @param date - Date à comparer
         */
        formatDistance: (date: Date | string): string => {
            return formatDistance(new Date(date), new Date(), {
                addSuffix: true,
                locale: currentLocale,
            });
        },

        /**
         * Affiche la date de manière relative (ex: "aujourd'hui à 14:30")
         * @param date - Date à formater
         */
        formatRelative: (date: Date | string): string => {
            return formatRelative(new Date(date), new Date(), {
                locale: currentLocale,
            });
        },

        /**
         * Formate date + heure pour l'affichage (ex: "13 janvier 2026 à 14:30")
         * @param date - Date à formater
         */
        formatDateTime: (date: Date | string): string => {
            return format(new Date(date), 'PPP pp', { locale: currentLocale });
        },

        /**
         * Formate seulement l'heure (ex: "14:30")
         * @param date - Date à formater
         */
        formatTime: (date: Date | string): string => {
            return format(new Date(date), 'HH:mm', { locale: currentLocale });
        },
    };
}

/**
 * Hook pour formater les numéros de téléphone sénégalais
 */
export function useFormatPhone() {
    return (phone: string): string => {
        // Nettoie le numéro
        const cleaned = phone.replace(/\D/g, '');

        // Format sénégalais: +221 XX XXX XX XX
        if (cleaned.startsWith('221') && cleaned.length === 12) {
            return `+221 ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8, 10)} ${cleaned.slice(10)}`;
        }

        // Format local: XX XXX XX XX
        if (cleaned.length === 9) {
            return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 7)} ${cleaned.slice(7)}`;
        }

        return phone;
    };
}

/**
 * Hook pour formater les statistiques de combat
 */
export function useFormatFighterStats() {
    const { t } = useTranslation();

    return {
        /**
         * Formate le bilan d'un lutteur (ex: "12V - 3D")
         */
        formatRecord: (wins: number, losses: number): string => {
            return `${wins}${t('fight.wins').charAt(0)} - ${losses}${t('fight.losses').charAt(0)}`;
        },

        /**
         * Calcule le taux de victoire en pourcentage
         */
        winRate: (wins: number, losses: number): string => {
            const total = wins + losses;
            if (total === 0) return '0%';
            const rate = (wins / total) * 100;
            return `${rate.toFixed(1)}%`;
        },
    };
}

/**
 * Fonction utilitaire pour formater les montants (sans hook)
 */
export function formatCurrency(amount: number, locale = 'fr'): string {
    const formatted = new Intl.NumberFormat(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);

    return `${formatted} FCFA`;
}

/**
 * Fonction utilitaire pour formater les dates (sans hook)
 */
export function formatDate(date: Date | string, formatStr = 'PPP', locale = 'fr'): string {
    const locales: Record<string, Locale> = {
        fr: fr,
        en: enUS,
        wo: fr,
    };

    return format(new Date(date), formatStr, { locale: locales[locale] || fr });
}
