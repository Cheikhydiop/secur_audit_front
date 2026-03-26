import { io, Socket } from 'socket.io-client';
import config from '@/config';

/**
 * SocketService — Gestion de la connexion WebSocket côté client
 */
class SocketService {
    private socket: Socket | null = null;
    private listeners: Map<string, Set<(data: any) => void>> = new Map();

    /**
     * Connecte le socket avec le token JWT
     */
    connect(token: string) {
        if (this.socket?.connected) return;

        const baseUrl = config.apiUrl.replace('/api', '');

        this.socket = io(baseUrl, {
            path: '/ws',
            query: { token },
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
        });

        this.socket.on('connect', () => {
            console.log('🔌 WebSocket connecté');
        });

        this.socket.on('disconnect', (reason) => {
            console.log('🔌 WebSocket déconnecté:', reason);
        });

        this.socket.on('error', (err) => {
            console.error('🔌 WebSocket erreur:', err);
        });

        // Re-enregistrer tous les listeners sur le nouveau socket
        this.listeners.forEach((callbacks, event) => {
            callbacks.forEach(cb => this.socket?.on(event, cb));
        });
    }

    /**
     * Déconnecte le socket
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    /**
     * Ajoute un listener pour un événement
     */
    on(event: string, callback: (data: any) => void) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)?.add(callback);
        this.socket?.on(event, callback);
    }

    /**
     * Supprime un listener
     */
    off(event: string, callback: (data: any) => void) {
        this.listeners.get(event)?.delete(callback);
        this.socket?.off(event, callback);
    }

    /**
     * Émet un événement
     */
    emit(event: string, data: any) {
        this.socket?.emit(event, data);
    }

    get isConnected() {
        return this.socket?.connected || false;
    }
}

export const socketService = new SocketService();
