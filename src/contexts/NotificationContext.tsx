import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Notification, notificationService } from '../services/NotificationService';
import { useAuth } from './AuthContext';
import { io, Socket } from 'socket.io-client';
import config from '../config';
import { useToast } from '@/hooks/use-toast';

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;
    refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within NotificationProvider');
    }
    return context;
};

interface NotificationProviderProps {
    children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [socket, setSocket] = useState<Socket | null>(null);

    // Initialize WebSocket connection
    useEffect(() => {
        if (!user) return;

        // Get token from localStorage
        const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
        if (!token) return;

        const newSocket = io(config.wsUrl, {
            path: '/ws',
            query: { token },
            transports: ['websocket'],
            reconnectionAttempts: 5
        });

        newSocket.on('connect', () => {
            console.log('WebSocket connected for notifications');
        });

        newSocket.on('notification', (notification: any) => {
            // Add new notification to the list
            setNotifications(prev => [notification, ...prev]);
            setUnreadCount(prev => prev + 1);

            // Jouer le son
            try {
                // Utilisation d'un son doux et court (hébergé ou base64)
                // Use Base64 sound to ensure availability
                const audio = new Audio('data:audio/mp3;base64,//uQxAAAAAAAAAAAAEluZm8AAAAPAAAAEAAAB2AAICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg//uQxAAACtsMzp0AABAAA0gAAABAAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAAQAAAaQAAAAg//uQxAAAAA0gAAABAAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAAQAAAaQAAAAg//uQxAAAAA0gAAABAAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAAQAAAaQAAAAg//uQxAAAAA0gAAABAAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAAQAAAaQAAAAg'); // Simple short beep
                audio.volume = 0.7; // Slightly louder

                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.warn("Audio playback prevented by browser:", error);
                    });
                }
            } catch (e) {
                console.error('Audio error', e);
            }

            // Afficher le toast
            toast({
                title: notification.title || 'Nouvelle notification',
                description: notification.message,
                variant: 'default', // ou un style personnalisé
            });

            console.log('New notification received:', notification);
        });

        newSocket.on('disconnect', () => {
            console.log('WebSocket disconnected');
        });

        setSocket(newSocket);

        return () => {
            newSocket.close();
        };
    }, [user]);

    // Load notifications on mount
    useEffect(() => {
        if (user) {
            refreshNotifications();
        }
    }, [user]);

    const refreshNotifications = async () => {
        try {
            setLoading(true);
            const [notifResponse, countResponse] = await Promise.all([
                notificationService.getNotifications({ limit: 20 }),
                notificationService.getUnreadCount(),
            ]);

            if (notifResponse.data) {
                setNotifications(notifResponse.data);
            }
            if (countResponse.data) {
                setUnreadCount(countResponse.data.count);
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            await notificationService.markAsRead(id);
            setNotifications(prev =>
                prev.map(n => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications(prev =>
                prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
            );
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const deleteNotification = async (id: string) => {
        try {
            await notificationService.deleteNotification(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
            const wasUnread = notifications.find(n => n.id === id && !n.isRead);
            if (wasUnread) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const value = {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refreshNotifications,
    };

    return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};
