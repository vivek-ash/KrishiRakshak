/**
 * Socket.io Client — Real-time alert handling
 */
class SocketClient {
    constructor() {
        this.socket = null;
        this.connected = false;
    }

    connect() {
        if (typeof io === 'undefined') {
            console.warn('Socket.io client library not loaded');
            return;
        }

        this.socket = io(window.location.origin);

        this.socket.on('connect', () => {
            this.connected = true;
            console.log('🔌 Connected to alert server');

            // Join user-specific room
            if (window.auth?.userData?._id) {
                this.socket.emit('join-user-room', window.auth.userData._id);
                this.socket.emit('join-role-room', window.auth.userData.role);
            }
        });

        this.socket.on('new-alert', (alert) => {
            this.handleNewAlert(alert);
        });

        this.socket.on('disconnect', () => {
            this.connected = false;
            console.log('❌ Disconnected from alert server');
        });
    }

    handleNewAlert(alert) {
        // Show toast notification
        const severityIcons = { low: '🟢', medium: '🟡', high: '🟠', critical: '🔴' };
        const icon = severityIcons[alert.severity] || '🔔';

        Toast.show(
            alert.severity === 'critical' ? 'error' : 'warning',
            `${icon} ${alert.title}`,
            alert.description?.substring(0, 100) + '...',
            8000
        );

        // Browser notification
        if (Notification.permission === 'granted') {
            new Notification(`🌿 KrishiRakshak Alert: ${alert.title}`, {
                body: alert.description,
                icon: '/img/icon.png',
                tag: alert._id,
            });
        }

        // Update badge count
        this.updateBadge();

        // Dispatch custom event for dashboard listeners
        window.dispatchEvent(new CustomEvent('new-alert', { detail: alert }));
    }

    updateBadge() {
        const badge = document.querySelector('.bell-badge');
        if (badge) {
            const current = parseInt(badge.textContent) || 0;
            badge.textContent = current + 1;
            badge.style.display = 'flex';
        }
    }

    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    disconnect() {
        if (this.socket) this.socket.disconnect();
    }
}

window.socketClient = new SocketClient();
