/**
 * ═══════════════════════════════════════════════════════════════
 *  App.js — Core application utilities
 *  Toast notifications, modals, helpers, navbar behavior
 * ═══════════════════════════════════════════════════════════════
 */

// ── Toast Notifications ──────────────────────────────────────
class Toast {
    static container = null;

    static init() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
    }

    static show(type, title, message, duration = 4000) {
        this.init();
        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                ${message ? `<div class="toast-message">${message}</div>` : ''}
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
        `;
        this.container.appendChild(toast);
        setTimeout(() => toast.remove(), duration);
    }

    static success(title, msg) { this.show('success', title, msg); }
    static error(title, msg) { this.show('error', title, msg); }
    static warning(title, msg) { this.show('warning', title, msg); }
    static info(title, msg) { this.show('info', title, msg); }
}

// ── Modal Manager ────────────────────────────────────────────
class Modal {
    static open(id) {
        const overlay = document.getElementById(id);
        if (overlay) {
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    static close(id) {
        const overlay = document.getElementById(id);
        if (overlay) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    static closeAll() {
        document.querySelectorAll('.modal-overlay.active').forEach(m => {
            m.classList.remove('active');
        });
        document.body.style.overflow = '';
    }
}

// ── Navbar Scroll Effect ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            navbar.classList.toggle('scrolled', window.scrollY > 20);
        });
    }

    // Mobile menu toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
        });

        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', () => {
                sidebar.classList.remove('open');
                sidebarOverlay.classList.remove('active');
            });
        }
    }

    // Language selector
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.dataset.lang;
            document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (window.i18n) {
                window.i18n.setLanguage(lang);
            }
        });
    });

    // Set active language button
    if (window.i18n) {
        const activeLang = window.i18n.getLanguage();
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === activeLang);
        });
        window.i18n.updatePage();
    }

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) Modal.closeAll();
        });
    });

    // Close modals on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') Modal.closeAll();
    });
});

// ── Utility Functions ────────────────────────────────────────
function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(dateStr) {
    const now = new Date();
    const past = new Date(dateStr);
    const diff = Math.floor((now - past) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return formatDate(dateStr);
}

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
}

// ── Geolocation Helper ───────────────────────────────────────
function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            (err) => reject(err),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
    });
}

// ── Number Formatter ─────────────────────────────────────────
function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toString() || '0';
}

// ── Weather Icon Helper ──────────────────────────────────────
function getWeatherEmoji(code) {
    if (!code) return '🌤️';
    const id = parseInt(code);
    if (id >= 200 && id < 300) return '⛈️';
    if (id >= 300 && id < 400) return '🌦️';
    if (id >= 500 && id < 600) return '🌧️';
    if (id >= 600 && id < 700) return '❄️';
    if (id >= 700 && id < 800) return '🌫️';
    if (id === 800) return '☀️';
    if (id > 800) return '☁️';
    return '🌤️';
}

// Make globals available
window.Toast = Toast;
window.Modal = Modal;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.timeAgo = timeAgo;
window.getInitials = getInitials;
window.getCurrentLocation = getCurrentLocation;
window.formatNumber = formatNumber;
window.getWeatherEmoji = getWeatherEmoji;
