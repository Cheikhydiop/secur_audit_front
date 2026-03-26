import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { socketService } from '@/services/SocketService';
import { toast } from 'sonner';
import { Bell, Info, AlertTriangle, CheckCircle } from 'lucide-react';

interface SocketContextType {
    isConnected: boolean;
    unreadCount: number;
    refreshUnreadCount: () => void;
}

const SocketContext = createContext<SocketContextType>({
    isConnected: false,
    unreadCount: 0,
    refreshUnreadCount: () => { }
});


export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, token } = useAuth();
    const [isConnected, setIsConnected] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const refreshUnreadCount = async () => {
        if (!token) return;
        try {
            const { notificationService } = await import('@/services/NotificationService');
            const res = await notificationService.getUnreadCount();
            if (res.data) setUnreadCount(res.data.count);
        } catch (err) {
            console.error('Erreur chargement notifications:', err);
        }
    };

    useEffect(() => {
        if (token && user) {
            socketService.connect(token);
            setIsConnected(true);
            refreshUnreadCount();

            // Écouter les notifications globales
            const handleNotification = (data: any) => {
                setUnreadCount(prev => prev + 1);
                const title = data.title || 'Notification';

                const message = data.message || '';
                const type = data.type || 'info';

                // Affichage d'un toast enrichi
                toast.message(title, {
                    description: message,
                    icon: getIcon(type),
                    duration: 8000,
                    className: "border-2 border-sonatel-orange bg-white shadow-2xl rounded-2xl p-4",
                    descriptionClassName: "text-[11px] font-bold text-gray-500 mt-1",
                    action: data.action ? {
                        label: data.action.label,
                        onClick: () => window.location.href = data.action.url
                    } : undefined,
                });
            };

            const getIcon = (type: string) => {
                switch (type) {
                    case 'URGENT':
                    case 'CRITICAL':
                        return <AlertTriangle className="h-5 w-5 text-red-500" />;
                    case 'SUCCESS':
                        return <CheckCircle className="h-5 w-5 text-emerald-500" />;
                    case 'WARNING':
                        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
                    default:
                        return <Bell className="h-5 w-5 text-sonatel-orange" />;
                }
            };

            socketService.on('notification', handleNotification);

            // Événements spécifiques métier
            socketService.on('inspection_validated', (data) => {
                toast.success('Inspection Validée !', {
                    description: `Votre inspection sur le site ${data.siteName} a été approuvée.`
                });
            });

            socketService.on('action_assigned', (data) => {
                toast('Nouvelle Action Assignée', {
                    description: data.description,
                    icon: <Info className="h-5 w-5 text-sonatel-orange" />
                });
            });

            return () => {
                socketService.off('notification', handleNotification);
                socketService.disconnect();
                setIsConnected(false);
            };
        } else {
            socketService.disconnect();
            setIsConnected(false);
        }
    }, [token, user]);

    return (
        <SocketContext.Provider value={{ isConnected, unreadCount, refreshUnreadCount }}>
            {children}
        </SocketContext.Provider>
    );
};

