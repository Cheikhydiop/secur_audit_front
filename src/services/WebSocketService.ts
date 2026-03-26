import { io, Socket } from 'socket.io-client';
import { toast } from '@/hooks/use-toast';
import config from '@/config';

// Enum updated to match backend event names for SONATEL Questionnaire
export enum WebSocketEvent {
    CONNECTION_STATUS = 'connection_status',
    AUTH_ERROR = 'auth_error',

    // Inspections
    INSPECTION_CREATED = 'inspection_created',
    INSPECTION_UPDATED = 'inspection_updated',
    INSPECTION_SUBMITTED = 'inspection_submitted',
    INSPECTION_VALIDATED = 'inspection_validated',
    INSPECTION_REJECTED = 'inspection_rejected',

    // Actions
    ACTION_CREATED = 'action_created',
    ACTION_UPDATED = 'action_updated',
    ACTION_STATUS_CHANGED = 'action_status_changed',
    ACTION_ASSIGNED = 'action_assigned',
    ACTION_DUE_SOON = 'action_due_soon',
    ACTION_OVERDUE = 'action_overdue',

    // Notifications
    NOTIFICATION = 'notification',
    NOTIFICATION_READ = 'notification_read',

    // Subscriptions
    SUBSCRIBE_INSPECTION = 'subscribe_inspection',
    UNSUBSCRIBE_INSPECTION = 'unsubscribe_inspection',
    SUBSCRIBE_SITE = 'subscribe_site',
    UNSUBSCRIBE_SITE = 'unsubscribe_site',

    // Health check
    PING = 'ping',
    PONG = 'pong'
}

type MessageHandler = (payload: any) => void;

class WebSocketService {
    private socket: Socket | null = null;
    private handlers: Map<string, Set<MessageHandler>> = new Map();
    private baseUrl: string;
    private audioContext: AudioContext | null = null;

    constructor() {
        const envUrl = import.meta.env.VITE_WS_URL || config.wsUrl;
        // Remove /ws suffix if present as it's added via path option
        this.baseUrl = envUrl.replace(/\/ws\/?$/, '');
    }

    public connect(userId?: string) {
        if (this.socket?.connected) return;

        const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
        if (!token) {
            console.warn('[WebSocket] Cannot connect: No token found');
            return;
        }

        console.log('[WebSocket] Connecting to Socket.io at', this.baseUrl);

        this.socket = io(this.baseUrl, {
            path: '/ws', // Matches backend configuration
            query: { token }, // Backend expects token in query
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            withCredentials: true
        });

        this.socket.on('connect', () => {
            console.log('[WebSocket] Connected', this.socket?.id);

            // Log connection status
            this.handleMessage(WebSocketEvent.CONNECTION_STATUS, {
                status: 'connected',
                userId: userId,
                socketId: this.socket?.id
            });
        });

        this.socket.on('connect_error', (err) => {
            console.error('[WebSocket] Connection Error', err.message);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('[WebSocket] Disconnected:', reason);
        });

        // Listen to ALL events and dispatch to handlers
        this.socket.onAny((eventName, ...args) => {
            const data = args[0];
            console.debug(`[WebSocket] Event received: ${eventName}`, data);

            this.handleMessage(eventName, data);

            // Global handling for notifications
            if (eventName === WebSocketEvent.NOTIFICATION) {
                this.playNotificationSound();
                toast({
                    title: data.title || 'Notification',
                    description: data.message || data.description,
                    duration: 6000,
                });
            }
            // Inspection events
            else if (eventName === WebSocketEvent.INSPECTION_CREATED) {
                this.playNotificationSound();
                toast({
                    title: 'Nouvelle Inspection',
                    description: `Une nouvelle inspection a été créée pour le site: ${data.siteName || 'N/A'}`,
                    duration: 6000,
                    className: "bg-orange-50 border-orange-200"
                });
            }
            else if (eventName === WebSocketEvent.INSPECTION_SUBMITTED) {
                this.playNotificationSound();
                toast({
                    title: 'Inspection Soumise',
                    description: `Inspection soumise pour le site: ${data.siteName || 'N/A'}`,
                    duration: 6000,
                    className: "bg-orange-50 border-orange-200"
                });
            }
            else if (eventName === WebSocketEvent.INSPECTION_VALIDATED) {
                this.playNotificationSound();
                toast({
                    title: 'Inspection Validée',
                    description: `Votre inspection pour ${data.siteName || 'le site'} a été validée!`,
                    duration: 6000,
                    className: "bg-green-50 border-green-200"
                });
            }
            else if (eventName === WebSocketEvent.INSPECTION_REJECTED) {
                this.playNotificationSound();
                toast({
                    title: 'Inspection Rejetée',
                    description: `Votre inspection pour ${data.siteName || 'le site'} a été rejetée.`,
                    variant: 'destructive',
                    duration: 8000,
                });
            }
            // Action events
            else if (eventName === WebSocketEvent.ACTION_CREATED) {
                this.playNotificationSound();
                toast({
                    title: 'Nouvelle Action Créée',
                    description: `Une nouvelle action a été créée: ${data.description || 'N/A'}`,
                    duration: 6000,
                    className: "bg-orange-50 border-orange-200"
                });
            }
            else if (eventName === WebSocketEvent.ACTION_ASSIGNED) {
                this.playNotificationSound();
                toast({
                    title: 'Action Assignée',
                    description: `Une action vous a été assignée: ${data.description || 'N/A'}`,
                    duration: 6000,
                    className: "bg-yellow-50 border-yellow-200"
                });
            }
            else if (eventName === WebSocketEvent.ACTION_STATUS_CHANGED) {
                toast({
                    title: 'Statut d\'Action Mis à Jour',
                    description: `L'action "${data.description || 'N/A'}" est maintenant: ${data.statut || 'N/A'}`,
                    duration: 5000,
                });
            }
            else if (eventName === WebSocketEvent.ACTION_DUE_SOON) {
                this.playNotificationSound();
                toast({
                    title: '⚠️ Action à Échéance Proche',
                    description: `L'action "${data.description || 'N/A'}" arrive à échéance bientôt!`,
                    variant: 'destructive',
                    duration: 8000,
                });
            }
            else if (eventName === WebSocketEvent.ACTION_OVERDUE) {
                this.playNotificationSound();
                toast({
                    title: '🔴 Action en Retard',
                    description: `L'action "${data.description || 'N/A'}" est en retard!`,
                    variant: 'destructive',
                    duration: 10000,
                });
            }
        });
    }

    public disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    public sendMessage(type: WebSocketEvent, payload: any = {}) {
        if (this.socket?.connected) {
            this.socket.emit(type, payload);
        } else {
            console.warn('[WebSocket] Cannot send message: not connected');
        }
    }

    // Subscribe to inspection updates
    public subscribeToInspection(inspectionId: string) {
        this.sendMessage(WebSocketEvent.SUBSCRIBE_INSPECTION, { inspectionId });
    }

    public unsubscribeFromInspection(inspectionId: string) {
        this.sendMessage(WebSocketEvent.UNSUBSCRIBE_INSPECTION, { inspectionId });
    }

    // Subscribe to site updates
    public subscribeToSite(siteId: string) {
        this.sendMessage(WebSocketEvent.SUBSCRIBE_SITE, { siteId });
    }

    public unsubscribeFromSite(siteId: string) {
        this.sendMessage(WebSocketEvent.UNSUBSCRIBE_SITE, { siteId });
    }

    public on(type: WebSocketEvent, handler: MessageHandler) {
        if (!this.handlers.has(type)) {
            this.handlers.set(type, new Set());
        }
        this.handlers.get(type)?.add(handler);
    }

    public off(type: WebSocketEvent, handler: MessageHandler) {
        this.handlers.get(type)?.delete(handler);
    }

    /**
     * Initialise le contexte audio au premier clic utilisateur.
     * Contourne l'autoplay policy des navigateurs.
     */
    public initAudio() {
        try {
            if (!this.audioContext) {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                if (AudioContextClass) {
                    this.audioContext = new AudioContextClass();
                }
            }

            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume().then(() => {
                    console.log('AudioContext resumed successfully');
                });
            }
        } catch (e) {
            console.error('Error initializing audio:', e);
        }
    }

    public playNotificationSound() {
        try {
            // Ensure audio is initialized and running
            this.initAudio();

            if (!this.audioContext) return;

            const ctx = this.audioContext;

            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();

            osc.connect(gainNode);
            gainNode.connect(ctx.destination);

            // Frequency: 800Hz (High Ping) -> 500Hz (Fade)
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.15);

            // Volume Envelope
            gainNode.gain.setValueAtTime(0, ctx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);

        } catch (e) {
            console.error('Error playing notification sound:', e);
        }
    }

    public isConnected(): boolean {
        return this.socket?.connected || false;
    }

    private handleMessage(type: string, payload: any) {
        const typeHandlers = this.handlers.get(type);
        if (typeHandlers) {
            typeHandlers.forEach(handler => handler(payload));
        }
    }
}

export const webSocketService = new WebSocketService();
