/**
 * Alert Model
 * Stores pest/disease alerts sent by admins to farmers
 * Supports location-based and crop-specific targeting
 */
const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Alert title is required'],
        trim: true,
    },
    description: {
        type: String,
        required: [true, 'Alert description is required'],
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium',
    },
    type: {
        type: String,
        enum: ['pest', 'disease', 'weather', 'general'],
        default: 'general',
    },
    affectedCrops: [{
        type: String,
        trim: true,
    }],
    affectedRegions: [{
        state: String,
        district: String,
    }],
    targetLocation: {
        type: { type: String, enum: ['Point'] },  // No default — prevents empty GeoJSON
        coordinates: [Number],
        radiusKm: { type: Number, default: 50 },
    },
    treatment: {
        type: String,
    },
    preventiveMeasures: [{
        type: String,
    }],
    targetFarmers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    sendToAll: {
        type: Boolean,
        default: false,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    expiresAt: {
        type: Date,
    },
    readBy: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        readAt: { type: Date, default: Date.now },
    }],
}, {
    timestamps: true,
});

alertSchema.index({ 'targetLocation': '2dsphere' }, { sparse: true });
alertSchema.index({ severity: 1, isActive: 1, createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);