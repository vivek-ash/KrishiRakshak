/**
 * ChatHistory Model
 * Stores chat messages per farmer for context awareness and learning
 */
const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['user', 'assistant'],
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    hasImage: {
        type: Boolean,
        default: false,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
});

const chatHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    messages: [chatMessageSchema],
    lastActive: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});

// Keep only last 50 messages per user to avoid bloat
chatHistorySchema.methods.addMessage = function(role, content, hasImage = false) {
    this.messages.push({ role, content, hasImage });
    // Trim to last 50
    if (this.messages.length > 50) {
        this.messages = this.messages.slice(-50);
    }
    this.lastActive = new Date();
    return this.save();
};

// Get recent context (last N messages) for AI prompt
chatHistorySchema.methods.getRecentContext = function(count = 10) {
    return this.messages.slice(-count).map(m => ({
        role: m.role,
        content: m.content,
    }));
};

module.exports = mongoose.model('ChatHistory', chatHistorySchema);
