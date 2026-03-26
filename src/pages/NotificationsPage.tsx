import React, { useState, useEffect } from "react";
import {
    Bell,
    CheckCircle,
    AlertTriangle,
    X,
    Trash2,
    Clock,
    Infinity,
    Check
} from "lucide-react";
import { notificationService, Notification } from "@/services/NotificationService";
import { useSocket } from "@/contexts/SocketContext";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const { refreshUnreadCount } = useSocket();

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const res = await notificationService.getNotifications({ limit: 50 });
            if (res.data) {
                setNotifications(res.data);
            }
        } catch (err) {
            console.error("Erreur chargement notifications:", err);
            toast.error("Impossible de charger les notifications");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const markAsRead = async (id: string) => {
        try {
            await notificationService.markAsRead(id);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, isRead: true } : n)
            );
            refreshUnreadCount();
        } catch (err) {
            console.error(err);
        }
    };

    const markAllRead = async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            refreshUnreadCount();
            toast.success("Toutes les notifications marquées comme lues");
        } catch (err) {
            console.error(err);
        }
    };

    const deleteNotif = async (id: string) => {
        try {
            await notificationService.deleteNotification(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
            refreshUnreadCount();
        } catch (err) {
            console.error(err);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'SUCCESS': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
            case 'WARNING': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
            case 'ERROR': return <AlertTriangle className="w-5 h-5 text-red-500" />;
            case 'INSPECTION_SUBMITTED': return <Bell className="w-5 h-5 text-sonatel-orange" />;
            case 'ACTION_ASSIGNED': return <Clock className="w-5 h-5 text-sonatel-orange" />;
            default: return <Bell className="w-5 h-5 text-gray-400" />;
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mt-2">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-sonatel-orange/10 flex items-center justify-center">
                        <Bell className="w-6 h-6 text-sonatel-orange" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-gray-900 leading-none">Notifications</h1>
                        <p className="text-sm text-gray-400 font-medium mt-1">Restez informé de l'activité du réseau</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={markAllRead}
                        className="flex items-center gap-2 px-4 h-10 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold text-xs transition-all border border-gray-200"
                    >
                        <Check className="w-4 h-4" />
                        Tout marquer comme lu
                    </button>
                    <button
                        onClick={fetchNotifications}
                        className="w-10 h-10 rounded-xl bg-gray-50 hover:bg-gray-100 flex items-center justify-center border border-gray-200 text-gray-400 transition-all"
                    >
                        <Infinity className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center gap-4">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-sonatel-orange border-t-transparent" />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="p-20 flex flex-col items-center justify-center text-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
                            <Bell className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-gray-400 font-medium">Aucune notification pour le moment</p>
                    </div>
                ) : (
                    notifications.map((notif) => (
                        <div
                            key={notif.id}
                            className={`p-5 flex items-start gap-4 transition-colors hover:bg-gray-50/50 ${!notif.isRead ? 'bg-orange-50/20' : ''}`}
                        >
                            <div className={`mt-1 h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${!notif.isRead ? 'bg-white shadow-sm ring-1 ring-gray-100' : 'bg-gray-50'}`}>
                                {getIcon(notif.type)}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <h3 className={`text-sm font-black truncate ${!notif.isRead ? 'text-gray-900' : 'text-gray-500'}`}>
                                        {notif.title}
                                    </h3>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight whitespace-nowrap">
                                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: fr })}
                                    </span>
                                </div>
                                <p className={`text-[13px] leading-relaxed mt-1 ${!notif.isRead ? 'text-gray-600 font-medium' : 'text-gray-400'}`}>
                                    {notif.message}
                                </p>

                                <div className="mt-3 flex items-center gap-3">
                                    {!notif.isRead && (
                                        <button
                                            onClick={() => markAsRead(notif.id)}
                                            className="text-[11px] font-black text-sonatel-orange hover:underline uppercase tracking-wider"
                                        >
                                            Marquer comme lu
                                        </button>
                                    )}
                                    <button
                                        onClick={() => deleteNotif(notif.id)}
                                        className="text-[11px] font-black text-gray-400 hover:text-red-500 uppercase tracking-wider flex items-center gap-1"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        Supprimer
                                    </button>
                                </div>
                            </div>

                            {!notif.isRead && (
                                <div className="w-2 h-2 rounded-full bg-sonatel-orange shrink-0 mt-2" />
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
