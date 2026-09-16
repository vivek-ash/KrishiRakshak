/**
 * Farm Model
 * Stores farm details for each farmer including crop, soil, location, and health tracking
 */
const mongoose = require('mongoose');

const farmSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    name: {
        type: String,
        required: [true, 'Farm name is required'],
        trim: true,
    },
    cropType: {
        type: String,
        required: [true, 'Crop type is required'],
        trim: true,
    },
    cropVariety: {
        type: String,
        trim: true,
    },
    // Multiple crops on same farm
    secondaryCrops: [{
        type: String,
        trim: true,
    }],
    soilType: {
        type: String,
        enum: ['clay', 'sandy', 'loamy', 'silt', 'peat', 'chalky', 'other'],
        required: true,
    },
    areaInAcres: {
        type: Number,
        min: 0,
    },
    location: {
        type: { type: String, default: 'Point' },
        coordinates: [Number],
    },
    address: {
        village: String,
        district: String,
        state: String,
    },
    plantingDate: {
        type: Date,
    },
    expectedHarvestDate: {
        type: Date,
    },
    healthStatus: {
        type: String,
        enum: ['healthy', 'mild_risk', 'moderate_risk', 'severe_risk', 'critical'],
        default: 'healthy',
    },
    lastInspection: {
        type: Date,
    },
    images: [{
        url: String,
        diagnosis: String,
        confidence: Number,
        uploadedAt: { type: Date, default: Date.now },
    }],
    // Farm cover/landscape photo URL
    farmPhoto: {
        type: String,
        default: '',
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
});

farmSchema.index({ location: '2dsphere' });
farmSchema.index({ cropType: 1, healthStatus: 1 });

module.exports = mongoose.model('Farm', farmSchema);
