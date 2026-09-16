/**
 * ═══════════════════════════════════════════════════════════════
 *  PEST ALERT SYSTEM — Main Server Entry Point
 *  Real-Time Pest and Disease Alert System for Farmers
 * ═══════════════════════════════════════════════════════════════
 */
require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');
const socketHandler = require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);

// ── Socket.io Setup ───────────────────────────────────────────
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
});
app.set('io', io);
socketHandler(io);

// ── Middleware ─────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Static Files ──────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../public')));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/farms', require('./routes/farms'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/diseases', require('./routes/diseases'));
app.use('/api/weather', require('./routes/weather'));
app.use('/api/chat', require('./routes/chat'));

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// ── SPA Fallback — serve index.html for unmatched routes ─────
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../public/index.html'));
    }
});

// ── Error Handler ─────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error.',
    });
});

// ── Start Server ──────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        await connectDB();
        server.listen(PORT, () => {
            console.log(`\n🌿 ═══════════════════════════════════════════════`);
            console.log(`🌿  KrishiRakshak running on port ${PORT}`);
            console.log(`🌿  http://localhost:${PORT}`);
            console.log(`🌿 ═══════════════════════════════════════════════\n`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        console.error('Please ensure MongoDB and Firebase are properly configured in .env');
        process.exit(1);
    }
};

startServer();
