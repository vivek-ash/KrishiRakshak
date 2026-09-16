/**
 * Disease Controller — production mode (no demo fallback)
 * CRUD for pest/disease database + AI disease detection
 * Auto-updates farm health status after scans
 */
const Disease = require('../models/Disease');
const Farm = require('../models/Farm');
const mongoose = require('mongoose');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

// POST /api/diseases — Admin: create disease entry
exports.createDisease = async (req, res) => {
    try {
        const disease = await Disease.create(req.body);
        return res.status(201).json({ success: true, data: disease });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ success: false, message: 'Disease already exists.' });
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/diseases — List all diseases
exports.getDiseases = async (req, res) => {
    try {
        const { page = 1, limit = 20, type, crop, search } = req.query;
        const query = { isActive: true };
        if (type) query.type = type;
        if (crop) query.affectedCrops = { $regex: crop, $options: 'i' };
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ];
        }
        const diseases = await Disease.find(query).sort({ name: 1 }).skip((page - 1) * limit).limit(parseInt(limit));
        const total = await Disease.countDocuments(query);
        return res.json({ success: true, data: diseases, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// GET /api/diseases/:id
exports.getDisease = async (req, res) => {
    try {
        const disease = await Disease.findById(req.params.id);
        if (!disease) return res.status(404).json({ success: false, message: 'Disease not found.' });
        return res.json({ success: true, data: disease });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// PUT /api/diseases/:id
exports.updateDisease = async (req, res) => {
    try {
        const disease = await Disease.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!disease) return res.status(404).json({ success: false, message: 'Disease not found.' });
        return res.json({ success: true, data: disease });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// DELETE /api/diseases/:id
exports.deleteDisease = async (req, res) => {
    try {
        await Disease.findByIdAndUpdate(req.params.id, { isActive: false });
        return res.json({ success: true, message: 'Disease deleted.' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// POST /api/diseases/detect — AI-based disease detection + health supervision
exports.detectDisease = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please upload an image.' });
        }

        // Farm selection is mandatory
        const farmId = req.body.farmId;
        if (!farmId) {
            try { fs.unlinkSync(req.file.path); } catch (e) {}
            return res.status(400).json({ success: false, message: 'Please select a farm before scanning.' });
        }

        const imagePath = req.file.path;
        const imageBase64 = fs.readFileSync(imagePath, { encoding: 'base64' });

        if (process.env.PLANT_AI_API_KEY && process.env.PLANT_AI_API_KEY !== 'your_plant_ai_api_key') {
            try {
                const apiUrl = (process.env.PLANT_AI_API_URL || 'https://crop.kindwise.com/api/v1') + '/identification';
                const response = await axios.post(
                    apiUrl,
                    {
                        images: [`data:image/jpeg;base64,${imageBase64}`],
                        latitude: parseFloat(req.body.latitude) || 20.5937,
                        longitude: parseFloat(req.body.longitude) || 78.9629,
                        similar_images: true,
                    },
                    {
                        headers: {
                            'Api-Key': process.env.PLANT_AI_API_KEY,
                            'Content-Type': 'application/json',
                        },
                    }
                );
                fs.unlinkSync(imagePath);

                const suggestions = response.data?.result?.disease?.suggestions || [];
                const isHealthy = response.data?.result?.is_healthy?.binary === true;
                const diseaseName = isHealthy ? 'Healthy Plant' : (suggestions[0]?.name || 'Unknown');
                const confidence = isHealthy
                    ? (response.data?.result?.is_healthy?.probability || 0.9)
                    : (suggestions[0]?.probability || 0);

                // Always generate AI advice (healthy = maintenance, disease = treatment)
                let aiTreatment = null;
                let aiPreventive = [];
                if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key') {
                    try {
                        const promptContent = isHealthy
                            ? `This crop is HEALTHY (${Math.round(confidence * 100)}% confidence). Give: 1) A positive health report confirming the crop is in good condition 2) Maintenance tips to keep it healthy 3) Three preventive measures. Format as JSON: {"treatment": "...", "preventive": ["...", "...", "..."]}`
                            : `Disease detected: ${diseaseName} (${Math.round(confidence * 100)}% confidence). Give: 1) Immediate treatment with specific chemical/organic options and dosage 2) Three preventive measures. Format as JSON: {"treatment": "...", "preventive": ["...", "...", "..."]}`;

                        const groqRes = await axios.post(
                            'https://api.groq.com/openai/v1/chat/completions',
                            {
                                model: 'llama-3.1-8b-instant',
                                messages: [
                                    { role: 'system', content: 'You are an expert agricultural scientist for Indian crops. Give practical, actionable advice. Respond with valid JSON only, no markdown or extra text.' },
                                    { role: 'user', content: promptContent }
                                ],
                                max_tokens: 400,
                                temperature: 0.4,
                            },
                            { headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' } }
                        );
                        const raw = groqRes.data.choices[0].message.content;
                        try {
                            const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
                            aiTreatment = parsed.treatment;
                            aiPreventive = parsed.preventive || [];
                        } catch (parseErr) {
                            aiTreatment = raw.replace(/```json|```/g, '').trim();
                        }
                    } catch (groqErr) {
                        console.error('Groq treatment error:', groqErr.message);
                    }
                }

                // Determine health status
                let healthStatus = 'healthy';
                if (!isHealthy) {
                    if (confidence >= 0.8) healthStatus = 'severe_risk';
                    else if (confidence >= 0.6) healthStatus = 'moderate_risk';
                    else if (confidence >= 0.3) healthStatus = 'mild_risk';
                }

                // Always update farm health
                let updatedFarm = null;
                try {
                    updatedFarm = await Farm.findOneAndUpdate(
                        { _id: farmId, owner: req.user._id },
                        {
                            healthStatus,
                            lastInspection: new Date(),
                            $push: {
                                images: { diagnosis: diseaseName, confidence, uploadedAt: new Date() },
                            },
                        },
                        { new: true }
                    );
                } catch (farmErr) {
                    console.error('Farm health update error:', farmErr.message);
                }

                // Auto-add detected disease to admin Disease database (skip healthy results)
                if (!isHealthy && diseaseName && diseaseName !== 'Unknown') {
                    try {
                        const existingDisease = await Disease.findOne({ name: { $regex: `^${diseaseName}$`, $options: 'i' } });
                        if (!existingDisease) {
                            const topSuggestion = suggestions[0] || {};
                            const cropType = updatedFarm?.cropType || 'Unknown';
                            const riskLevel = confidence >= 0.8 ? 'high' : confidence >= 0.5 ? 'medium' : 'low';
                            await Disease.create({
                                name: diseaseName,
                                type: 'other',
                                description: topSuggestion.details?.description || `Auto-detected disease: ${diseaseName} on ${cropType} crop. Identified via AI scan with ${Math.round(confidence * 100)}% confidence.`,
                                symptoms: topSuggestion.details?.symptoms ? [topSuggestion.details.symptoms] : [`Detected on ${cropType} crop`],
                                affectedCrops: [cropType],
                                treatment: aiTreatment ? {
                                    chemical: [],
                                    organic: [],
                                    cultural: [aiTreatment],
                                } : undefined,
                                preventiveMeasures: aiPreventive.length > 0 ? aiPreventive : [],
                                riskLevel,
                                isActive: true,
                            });
                            console.log(`✅ Auto-added disease to DB: ${diseaseName}`);
                        } else {
                            // Update affected crops list if new crop detected
                            const cropType = updatedFarm?.cropType;
                            if (cropType && !existingDisease.affectedCrops.some(c => c.toLowerCase() === cropType.toLowerCase())) {
                                await Disease.findByIdAndUpdate(existingDisease._id, {
                                    $addToSet: { affectedCrops: cropType },
                                });
                            }
                        }
                    } catch (diseaseDbErr) {
                        console.error('Auto-add disease DB error:', diseaseDbErr.message);
                    }
                }

                const defaultTreatment = isHealthy
                    ? '✅ Your crop is healthy! Continue regular watering, ensure proper nutrient supply, and monitor periodically for early signs of pests or diseases.'
                    : (suggestions[0]?.details?.description || 'Consult your local agriculture officer.');

                return res.json({
                    success: true,
                    data: {
                        source: 'kindwise',
                        disease: diseaseName,
                        confidence,
                        type: isHealthy ? 'healthy' : 'disease',
                        isHealthy,
                        treatment: aiTreatment || defaultTreatment,
                        preventive: aiPreventive,
                        healthStatus,
                        farmId,
                        result: response.data,
                    }
                });
            } catch (apiError) {
                console.error('Kindwise API error:', apiError.response?.data || apiError.message);
                try { fs.unlinkSync(imagePath); } catch (e) {}
                return res.status(502).json({ success: false, message: 'Disease detection service temporarily unavailable.' });
            }
        }

        try { fs.unlinkSync(imagePath); } catch (e) {}
        return res.status(503).json({ success: false, message: 'Disease detection service is not configured.' });
    } catch (error) {
        console.error('Detection error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/diseases/predict — Predict diseases based on weather + crop data
exports.predictDisease = async (req, res) => {
    try {
        const { cropType, temperature, humidity, rainfall, soilType, season } = req.body;
        const query = { isActive: true, affectedCrops: { $regex: cropType, $options: 'i' } };
        let diseases = await Disease.find(query);

        if (diseases.length === 0) {
            return res.json({ success: true, data: { predictions: [], source: 'database', message: 'No matching diseases found for this crop type.' } });
        }

        const scored = diseases.map(d => {
            let score = 0;
            const fc = d.favorableConditions || {};
            if (temperature >= (fc.temperatureMin || 0) && temperature <= (fc.temperatureMax || 50)) score += 30;
            if (humidity >= (fc.humidityMin || 0) && humidity <= (fc.humidityMax || 100)) score += 30;
            if (fc.soilTypes && fc.soilTypes.includes(soilType)) score += 20;
            if (fc.season && fc.season.includes(season)) score += 20;
            return { disease: d, riskScore: score };
        });
        scored.sort((a, b) => b.riskScore - a.riskScore);
        return res.json({ success: true, data: { predictions: scored.slice(0, 5), source: 'database' } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};