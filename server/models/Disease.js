/**
 * Disease Model
 * Comprehensive pest/disease database managed by admins
 * Includes symptoms, treatments, and affected crops
 */
const mongoose = require('mongoose');

const diseaseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Disease name is required'],
        trim: true,
        unique: true,
    },
    localNames: {
        hi: { type: String, trim: true },
        pa: { type: String, trim: true },
    },
    type: {
        type: String,
        enum: ['pest', 'fungal', 'bacterial', 'viral', 'nutritional', 'other'],
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    symptoms: [{
        type: String,
    }],
    affectedCrops: [{
        type: String,
        trim: true,
    }],
    favorableConditions: {
        temperatureMin: Number,
        temperatureMax: Number,
        humidityMin: Number,
        humidityMax: Number,
        season: [{ type: String, enum: ['kharif', 'rabi', 'zaid', 'all'] }],
        soilTypes: [String],
    },
    treatment: {
        chemical: [{ name: String, dosage: String, instructions: String }],
        organic: [{ name: String, instructions: String }],
        cultural: [String],
    },
    preventiveMeasures: [{
        type: String,
    }],
    images: [{
        type: String,
    }],
    riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium',
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
});

diseaseSchema.index({ name: 'text', description: 'text' });
diseaseSchema.index({ affectedCrops: 1, type: 1 });

module.exports = mongoose.model('Disease', diseaseSchema);
