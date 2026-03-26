import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { WifiOff, RefreshCw, X, Download, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Hook pour détecter l'état de la connexion réseau
 */
function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    return isOnline;
}

/**
 * Bannière PWA — affiche :
 * - Mode hors ligne (rouge)
 * - Mise à jour disponible (orange)
 * - Bouton "Installer l'app" si disponible (bleu)
 */
export function PWABanner() {
    const isOnline = useOnlineStatus();
    const [showOffline, setShowOffline] = useState(false);
    const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
    const [showInstall, setShowInstall] = useState(false);

    // Enregistrement SW + gestion mise à jour
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log("[PWA] Service Worker enregistré :", r);
        },
        onOfflineReady() {
            toast.success("Prêt pour le mode hors ligne", {
                description: "L'application fonctionne désormais sans connexion internet.",
                icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
                duration: 5000
            });
        },
        onRegisterError(error) {
            console.error("[PWA] Erreur SW :", error);
        },
    });

    // Détection offline avec délai (évite le flash au chargement)
    useEffect(() => {
        if (!isOnline) {
            const t = setTimeout(() => setShowOffline(true), 1000);
            return () => clearTimeout(t);
        } else {
            setShowOffline(false);
        }
    }, [isOnline]);

    // Capturer l'événement d'installation PWA
    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e);
            setShowInstall(true);
        };
        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    const handleInstall = async () => {
        if (!installPrompt) return;
        // @ts-ignore
        installPrompt.prompt();
        // @ts-ignore
        const { outcome } = await installPrompt.userChoice;
        if (outcome === "accepted") setShowInstall(false);
        setInstallPrompt(null);
    };

    return (
        <>
            {/* ── Bannière Offline ── */}
            {showOffline && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9998] flex items-center gap-3 px-5 py-3 bg-red-600 text-white rounded-2xl shadow-2xl shadow-red-500/30 animate-in slide-in-from-bottom-4 duration-300">
                    <WifiOff className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-bold">Mode hors ligne — données locales utilisées</span>
                </div>
            )}

            {/* ── Bannière Mise à jour ── */}
            {needRefresh && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9998] flex items-center gap-3 px-5 py-3 bg-sonatel-orange text-white rounded-2xl shadow-2xl shadow-orange-500/30 animate-in slide-in-from-bottom-4 duration-300">
                    <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />
                    <span className="text-sm font-bold">Mise à jour disponible</span>
                    <button
                        onClick={() => updateServiceWorker(true)}
                        className="ml-2 px-3 h-7 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-black transition-colors"
                    >
                        <span>Mettre à jour</span>
                    </button>
                    <button
                        onClick={() => setNeedRefresh(false)}
                        className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            )}

            {/* ── Bannière Installation PWA ── */}
            {showInstall && !needRefresh && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9998] flex items-center gap-3 px-5 py-3 bg-gray-900 text-white rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
                    <Download className="w-4 h-4 shrink-0 text-sonatel-orange" />
                    <span className="text-sm font-bold">Installer l'application</span>
                    <button
                        onClick={handleInstall}
                        className="ml-2 px-3 h-7 rounded-xl bg-sonatel-orange hover:bg-orange-500 text-xs font-black transition-colors"
                    >
                        <span>Installer</span>
                    </button>
                    <button
                        onClick={() => setShowInstall(false)}
                        className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            )}
        </>
    );
}
