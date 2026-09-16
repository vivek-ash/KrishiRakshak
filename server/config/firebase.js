/**
 * Firebase Admin SDK Configuration
 * Verifies Firebase ID tokens for authentication
 */
const admin = require('firebase-admin');

let firebaseInitialized = false;

try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_PROJECT_ID !== 'your-project-id' &&
        privateKey &&
        privateKey.length > 100
    ) {
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: privateKey,
                }),
            });
            firebaseInitialized = true;
            console.log('✅ Firebase Admin SDK initialized');
        }
    } else {
        console.error('❌ Firebase credentials not configured — authentication will not work');
    }
} catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
}

module.exports = admin;
module.exports.firebaseInitialized = firebaseInitialized;
