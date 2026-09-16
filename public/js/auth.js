/**
 * ═══════════════════════════════════════════════════════════════
 *  Auth Module — Firebase Authentication
 *  Handles login, signup, Google auth, and session management
 * ═══════════════════════════════════════════════════════════════
 */

// ── Firebase Configuration ────────────────────────────────────
const firebaseConfig = {
    apiKey: "AIzaSyB83C7UA9c36mSCBJf5uoHzuUjjGdvPkWU",
    authDomain: "krishirakshak-70af9.firebaseapp.com",
    projectId: "krishirakshak-70af9",
    storageBucket: "krishirakshak-70af9.firebasestorage.app",
    messagingSenderId: "168926998038",
    appId: "1:168926998038:web:7b7c2f9e2a804d555e4f37"
};

// Check if Firebase is loaded
let firebaseApp, firebaseAuth;
if (typeof firebase !== 'undefined') {
    try {
        firebaseApp = firebase.initializeApp(firebaseConfig);
        firebaseAuth = firebase.auth();
    } catch (e) {
        console.warn('Firebase init skipped (already initialized or config missing)');
        firebaseAuth = firebase.auth?.();
    }
}

/**
 * Auth Manager — handles all authentication flows
 */
class AuthManager {
    constructor() {
        this.user = null;
        this.token = null;
        this.userData = null;
        this.API_BASE = window.location.origin + '/api';
        this._loadSession();
    }

    // ── Session Persistence ──────────────────────────────────────
    _loadSession() {
        const saved = localStorage.getItem('pest_alert_session');
        if (saved) {
            try {
                const session = JSON.parse(saved);
                this.token = session.token;
                this.userData = session.userData;
            } catch (e) {
                localStorage.removeItem('pest_alert_session');
            }
        }
    }

    _saveSession() {
        localStorage.setItem('pest_alert_session', JSON.stringify({
            token: this.token,
            userData: this.userData,
        }));
    }

    _clearSession() {
        localStorage.removeItem('pest_alert_session');
        this.token = null;
        this.userData = null;
        this.user = null;
    }

    // ── Get auth headers ─────────────────────────────────────────
    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': this.token ? `Bearer ${this.token}` : '',
        };
    }

    // ── Check if logged in ───────────────────────────────────────
    isLoggedIn() {
        return !!this.token && !!this.userData;
    }

    getRole() {
        return this.userData?.role || 'farmer';
    }

    // ── Firebase Email/Password Signup ───────────────────────────
    async signup(name, email, password, role = 'farmer', phone = '') {
        try {
            if (!firebaseAuth) {
                throw new Error('Firebase is not available. Please refresh the page.');
            }

            // Create Firebase user
            const result = await firebaseAuth.createUserWithEmailAndPassword(email, password);
            await result.user.updateProfile({ displayName: name });

            // Store pending registration data for after verification
            localStorage.setItem('pending_registration', JSON.stringify({
                name, email, phone, role: 'farmer', firebaseUid: result.user.uid
            }));

            // Send verification email
            await result.user.sendEmailVerification();

            // Sign out — user must verify email before they can login
            await firebaseAuth.signOut();

            return {
                success: true,
                needsVerification: true,
                message: `Verification email sent to ${email}. Please check your inbox and verify before logging in.`,
            };
        } catch (error) {
            console.error('Signup error:', error);
            return { success: false, message: error.message };
        }
    }

    // ── Firebase Email/Password Login ────────────────────────────
    async login(email, password) {
        try {
            if (!firebaseAuth) {
                throw new Error('Firebase is not available. Please refresh the page.');
            }

            const result = await firebaseAuth.signInWithEmailAndPassword(email, password);

            // Block login if email not verified
            if (!result.user.emailVerified) {
                await firebaseAuth.signOut();
                return {
                    success: false,
                    needsVerification: true,
                    message: 'Your email is not verified yet. Please check your inbox and click the verification link.',
                };
            }

            const uid = result.user.uid;
            const token = await result.user.getIdToken();
            const name = result.user.displayName;

            this.token = token;

            // Try to find existing user in MongoDB
            let res = await fetch(`${this.API_BASE}/auth/login`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ firebaseUid: uid, email }),
            });
            let data = await res.json();

            // User verified email but not in MongoDB yet — register them now
            if (!data.success && res.status === 404) {
                const pending = JSON.parse(localStorage.getItem('pending_registration') || '{}');
                res = await fetch(`${this.API_BASE}/auth/register`, {
                    method: 'POST',
                    headers: this.getHeaders(),
                    body: JSON.stringify({
                        firebaseUid: uid,
                        name: pending.name || name || email.split('@')[0],
                        email,
                        phone: pending.phone || '',
                        role: 'farmer', // Always farmer — server handles first-user-admin
                    }),
                });
                data = await res.json();
                localStorage.removeItem('pending_registration');
            }

            if (data.success) {
                this.userData = data.data;
                this._saveSession();
                return { success: true, user: data.data };
            } else {
                await firebaseAuth.signOut();
                throw new Error(data.message || 'Login failed. Please sign up first.');
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: error.message };
        }
    }

    // ── Google Sign-In ───────────────────────────────────────────
    async googleSignIn(role = 'farmer') {
        try {
            if (!firebaseAuth) {
                throw new Error('Firebase is not available. Please refresh the page.');
            }

            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await firebaseAuth.signInWithPopup(provider);
            const token = await result.user.getIdToken();
            this.token = token;

            const res = await fetch(`${this.API_BASE}/auth/register`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    firebaseUid: result.user.uid,
                    name: result.user.displayName,
                    email: result.user.email,
                    role: 'farmer', // Always farmer — server handles first-user-admin
                }),
            });

            const data = await res.json();
            if (data.success) {
                this.userData = data.data;
                this._saveSession();
                return { success: true, user: data.data };
            }

            throw new Error(data.message || 'Google Sign-In failed');
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    // ── Logout ───────────────────────────────────────────────────
    async logout() {
        try {
            if (firebaseAuth) await firebaseAuth.signOut();
        } catch (e) { /* ignore */ }
        this._clearSession();
        window.location.href = '/login.html';
    }

    // ── Redirect based on role ───────────────────────────────────
    redirectToDashboard() {
        const role = this.getRole();
        if (role === 'admin') {
            window.location.href = '/admin-dashboard.html';
        } else {
            window.location.href = '/farmer-dashboard.html';
        }
    }

    // ── API Helper ───────────────────────────────────────────────
    async apiFetch(url, options = {}) {
        const res = await fetch(`${this.API_BASE}${url}`, {
            ...options,
            headers: { ...this.getHeaders(), ...options.headers },
        });

        if (res.status === 401) {
            this._clearSession();
            window.location.href = '/login.html';
            return null;
        }

        return res.json();
    }
}

// Global auth instance
window.auth = new AuthManager();