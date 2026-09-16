/**
 * Socket.io Handler
 * Manages real-time connections for live alerts and notifications
 */
module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log(`🔌 Client connected: ${socket.id}`);

        // Join user-specific room for targeted alerts
        socket.on('join-user-room', (userId) => {
            socket.join(`user-${userId}`);
            console.log(`👤 User ${userId} joined their room`);
        });

        // Join role-based room
        socket.on('join-role-room', (role) => {
            socket.join(`role-${role}`);
            console.log(`👥 Socket ${socket.id} joined role: ${role}`);
        });

        // Join location-based room
        socket.on('join-location-room', (location) => {
            const room = `loc-${location.state}-${location.district}`.toLowerCase().replace(/\s+/g, '-');
            socket.join(room);
            console.log(`📍 Socket ${socket.id} joined location: ${room}`);
        });

        // Admin broadcasts alert
        socket.on('broadcast-alert', (alertData) => {
            if (alertData.sendToAll) {
                socket.broadcast.emit('new-alert', alertData);
            } else {
                socket.to(`role-farmer`).emit('new-alert', alertData);
            }
        });

        // Typing indicator for chat
        socket.on('typing', (data) => {
            socket.broadcast.emit('user-typing', data);
        });

        socket.on('disconnect', () => {
            console.log(`❌ Client disconnected: ${socket.id}`);
        });
    });
};
