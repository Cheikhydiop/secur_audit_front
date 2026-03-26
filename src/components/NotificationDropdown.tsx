import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
    Bell,
    Check,
    Trash2,
    ExternalLink,
    MoreHorizontal,
    CheckCircle,
    AlertTriangle,
    Info,
    Clock
} from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useSocket } from "@/contexts/SocketContext";
import { notificationService, Notification } from "@/services/NotificationService";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export function NotificationDropdown() {
    const { unreadCount, refreshUnreadCount } = useSocket();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const fetchLatestNotifications = async () => {
        setLoading(true);
        try {
            const res = await notificationService.getNotifications({ limit: 5 });
            if (res.data) {
                setNotifications(res.data);
            }
        } catch (err) {
            console.error("Error fetching notifications:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchLatestNotifications();
        }
    }, [isOpen]);

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
            toast.success("Tout marqué comme lu");
        } catch (err) {
            console.error(err);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'SUCCESS': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
            case 'WARNING': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
            case 'ERROR': return <AlertTriangle className="w-4 h-4 text-red-500" />;
            case 'INSPECTION_SUBMITTED': return <Bell className="w-4 h-4 text-sonatel-orange" />;
            case 'ACTION_ASSIGNED': return <Clock className="w-4 h-4 text-sonatel-orange" />;
            default: return <Bell className="w-4 h-4 text-gray-400" />;
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <button className={`relative p-2.5 rounded-xl hover:bg-gray-100 transition-all group ${unreadCount > 0 ? 'bg-orange-50/50' : ''}`}>
                    <Bell
                        key="bell-icon"
                        className={`w-5.5 h-5.5 transition-colors ${unreadCount > 0 ? 'text-sonatel-orange animate-wiggle' : 'text-gray-500 group-hover:text-sonatel-orange'}`}
                    />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 h-[20px] min-w-[20px] px-1 bg-destructive text-[12px] font-black text-white rounded-full flex items-center justify-center border-2 border-white shadow-lg shadow-red-500/20 animate-bounce">
                            <span>{unreadCount > 9 ? '9+' : unreadCount}</span>
                        </span>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 md:w-96 p-0 rounded-2xl border-2 shadow-2xl overflow-hidden mr-4" align="end">
                <div className="flex items-center justify-between p-4 border-b bg-gray-50/50">
                    <h3 className="font-black text-sm text-gray-900 uppercase tracking-widest flex items-center gap-2">
                        <Bell className="w-4 h-4 text-sonatel-orange" /> <span>Notifications</span>
                    </h3>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-[12px] font-black uppercase text-sonatel-orange hover:text-sonatel-orange hover:bg-sonatel-orange/5"
                            onClick={markAllRead}
                        >
                            <span>Tout marquer comme lu</span>
                        </Button>
                    )}
                </div>

                <ScrollArea className="h-[350px]">
                    {loading ? (
                        <div className="flex h-32 items-center justify-center">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-sonatel-orange border-t-transparent" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 py-8 opacity-40">
                            <Bell className="w-8 h-8 mb-2" />
                            <p className="text-xs font-black uppercase tracking-widest"><span>Aucune notification</span></p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    className={`p-4 flex gap-4 transition-all hover:bg-orange-50/50 cursor-pointer border-l-4 ${!notif.isRead ? 'bg-orange-50/60 border-l-sonatel-orange' : 'border-l-transparent bg-white'}`}
                                    onClick={() => !notif.isRead && markAsRead(notif.id)}
                                >
                                    <div className={`mt-0.5 h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${!notif.isRead ? 'bg-white text-sonatel-orange ring-1 ring-orange-100' : 'bg-gray-50 text-gray-400'}`}>
                                        {getIcon(notif.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start gap-2 mb-1.5">
                                            <h4 className={`text-h6 font-black leading-tight truncate ${!notif.isRead ? 'text-gray-900' : 'text-gray-500'}`}>
                                                <span>{notif.title}</span>
                                            </h4>
                                            <span className="text-[12px] font-black text-gray-400 uppercase tracking-tighter whitespace-nowrap bg-gray-100 px-2 py-0.5 rounded-full">
                                                <span>{formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: fr })}</span>
                                            </span>
                                        </div>
                                        <p className={`text-[13px] leading-relaxed line-clamp-2 ${!notif.isRead ? 'text-gray-700 font-bold' : 'text-gray-400 font-medium'}`}>
                                            <span>{notif.message}</span>
                                        </p>
                                    </div>
                                    {!notif.isRead && (
                                        <div className="w-2.5 h-2.5 rounded-full bg-sonatel-orange shrink-0 mt-3 shadow-lg shadow-orange-500/50 animate-pulse" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                <div className="p-2 border-t bg-gray-50/30">
                    <Button
                        asChild
                        variant="ghost"
                        className="w-full h-10 rounded-xl font-black text-[13px] uppercase tracking-widest text-gray-500 hover:text-sonatel-orange"
                    >
                        <Link to="/notifications" onClick={() => setIsOpen(false)}>
                            <span>Voir toutes les notifications</span> <ExternalLink className="w-3 h-3 ml-2" />
                        </Link>
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
