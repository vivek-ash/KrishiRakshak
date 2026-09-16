/**
 * Chat Controller — KrishiMitra AI Assistant
 * Features:
 *  - Strict agriculture-only responses
 *  - Language enforcement (responds in user's chosen language)
 *  - Farm & crop health context awareness
 *  - Auto-updates farm health from BOTH text chat and image analysis
 *  - Deterministic health updates — uses farmId + keyword detection (no AI markers)
 *  - Chat history persistence per farmer
 */
const axios = require('axios');
const fs = require('fs');
const ChatHistory = require('../models/ChatHistory');
const Farm = require('../models/Farm');

const LANGUAGE_MAP = {
    en: 'English',
    hi: 'Hindi (हिंदी)',
    pa: 'Punjabi (ਪੰਜਾਬੀ)',
};

function buildSystemPrompt(language, farmContext) {
    const langName = LANGUAGE_MAP[language] || 'English';
    return `You are KrishiMitra (Farmer's Friend), an expert agricultural assistant for Indian farmers.

LANGUAGE RULE (MANDATORY — NEVER BREAK THIS):
- You MUST respond ONLY in ${langName}. Every single word of your response must be in ${langName}.
- Do NOT switch languages mid-response. Do NOT mix languages.
- If the user writes in a different language, still respond in ${langName}.

STRICT TOPIC RULES:
1. You ONLY answer questions related to: agriculture, farming, crops, pest management, disease identification, soil health, weather impact on crops, organic farming, fertilizers, irrigation, government agricultural schemes, mandi/market prices for crops, farm equipment, seed selection, and livestock care.
2. If the user asks about ANY topic outside agriculture (politics, entertainment, coding, sports, general knowledge, math, personal advice, jokes, etc.), politely decline in ${langName} and redirect to farming topics.
3. NEVER answer non-farming questions, even if the user insists.

FARM CONTEXT (this farmer's current data):
${farmContext || 'No farms registered yet.'}

BEHAVIOR RULES:
1. Be practical, clear, and actionable for farming questions.
2. Keep responses concise. Use bullet points where helpful.
3. Suggest specific treatments with dosages when relevant.
4. When recommending pesticides/chemicals, always mention safety precautions.
5. If the user mentions crop health or asks about their farms, use the FARM CONTEXT data above to give personalized advice.
6. If a farm shows 'severe_risk' or 'moderate_risk', proactively suggest treatment and monitoring steps.
7. If analyzing a crop image, describe findings and give actionable advice.
8. Remember previous messages in this conversation for contextual responses.`;
}

// Build farm context string
async function getFarmContext(userId) {
    try {
        const farms = await Farm.find({ owner: userId, isActive: true }).lean();
        if (!farms.length) return 'No farms registered yet.';

        return farms.map(f => {
            const health = (f.healthStatus || 'healthy').replace('_', ' ');
            const lastScan = f.lastInspection ? new Date(f.lastInspection).toLocaleDateString() : 'Never scanned';
            const recentDiag = f.images?.length > 0 ? f.images[f.images.length - 1].diagnosis : 'None';
            const crops = [f.cropType, ...(f.secondaryCrops || [])].filter(Boolean).join(', ');
            return `- Farm: "${f.name}" (ID: ${f._id}) | Crops: ${crops} | Soil: ${f.soilType} | Area: ${f.areaInAcres || '?'} acres | Health: ${health} | Last Scan: ${lastScan} | Last Diagnosis: ${recentDiag}`;
        }).join('\n');
    } catch (e) {
        return 'Could not load farm data.';
    }
}

// Get or create chat history
async function getChatHistory(userId) {
    let history = await ChatHistory.findOne({ userId });
    if (!history) {
        history = new ChatHistory({ userId, messages: [] });
        await history.save();
    }
    return history;
}

// ═══════════════════════════════════════════════════════════════
// DETERMINISTIC HEALTH DETECTION
// Detects health-related intent from farmer's message and updates
// the selected farm's health status directly — no AI marker needed
// ═══════════════════════════════════════════════════════════════
const HEALTH_POSITIVE_KEYWORDS = [
    'healthy', 'recovered', 'better now', 'better', 'cured', 'fixed',
    'no disease', 'good condition', 'crop is fine', 'farm is fine',
    'crop is good', 'farm is good', 'farm is healthy', 'crop is healthy',
    'health improved', 'improved', 'treated successfully', 'disease gone',
    'problem solved', 'growing well', 'looking good', 'no problem',
    'no pest', 'pest free', 'disease free', 'all good', 'doing well',
    'ठीक हो गया', 'स्वस्थ', 'ठीक है', 'बेहतर', 'सही है',
    'ਠੀਕ ਹੈ', 'ਵਧੀਆ', 'ਸਿਹਤਮੰਦ'
];

const HEALTH_NEGATIVE_KEYWORDS = [
    'disease', 'sick', 'dying', 'infected', 'pest attack', 'pest',
    'yellow leaves', 'wilting', 'damaged', 'bad condition', 'not good',
    'problem', 'worse', 'spots', 'rotting', 'fungus', 'blight',
    'worm', 'insect', 'bug', 'aphid', 'rust', 'mold', 'mildew',
    'brown spots', 'leaf curl', 'black spots', 'drying', 'dead',
    'रोग', 'बीमार', 'कीट', 'मर रहा', 'पीला', 'खराब',
    'ਬਿਮਾਰ', 'ਕੀੜਾ', 'ਖਰਾਬ'
];

function detectHealthIntent(message) {
    const msgLower = message.toLowerCase();

    const isPositive = HEALTH_POSITIVE_KEYWORDS.some(k => msgLower.includes(k));
    const isNegative = HEALTH_NEGATIVE_KEYWORDS.some(k => msgLower.includes(k));

    // Positive overrides negative — farmer saying "no disease" includes "disease" word
    if (isPositive && !isNegative) return 'healthy';
    if (isPositive && isNegative) return 'healthy'; // "disease gone" has both
    if (isNegative && !isPositive) return 'at_risk';

    return null;
}

async function updateFarmHealthFromChat(userId, farmId, healthIntent) {
    if (!farmId || !healthIntent) return null;

    try {
        let newStatus;
        if (healthIntent === 'healthy') {
            newStatus = 'healthy';
        } else {
            // Check current status to determine severity
            const farm = await Farm.findOne({ _id: farmId, owner: userId, isActive: true });
            if (!farm) return null;

            // If already at risk, increase severity. If healthy, set mild_risk
            const escalation = {
                'healthy': 'mild_risk',
                'mild_risk': 'moderate_risk',
                'moderate_risk': 'severe_risk',
                'severe_risk': 'severe_risk',
                'critical': 'critical',
            };
            newStatus = escalation[farm.healthStatus] || 'mild_risk';
        }

        const updatedFarm = await Farm.findOneAndUpdate(
            { _id: farmId, owner: userId, isActive: true },
            { healthStatus: newStatus, lastInspection: new Date() },
            { new: true }
        );

        if (updatedFarm) {
            return [{ name: updatedFarm.name, healthStatus: newStatus }];
        }
        return null;
    } catch (e) {
        console.error('Chat health update error:', e.message);
        return null;
    }
}

// Auto-update farm health from chatbot image analysis (specific farm)
async function updateFarmHealthFromImage(userId, farmId, isHealthy, confidence, diseaseName) {
    try {
        // Determine health status from scan
        let healthStatus = 'healthy';
        if (!isHealthy) {
            if (confidence >= 0.8) healthStatus = 'severe_risk';
            else if (confidence >= 0.6) healthStatus = 'moderate_risk';
            else if (confidence >= 0.3) healthStatus = 'mild_risk';
        }

        // If farmId provided, update that specific farm
        if (farmId) {
            const farm = await Farm.findOneAndUpdate(
                { _id: farmId, owner: userId, isActive: true },
                {
                    healthStatus,
                    lastInspection: new Date(),
                    $push: {
                        images: { diagnosis: diseaseName, confidence, uploadedAt: new Date() },
                    },
                },
                { new: true }
            );
            if (farm) return [{ name: farm.name, healthStatus }];
            return null;
        }

        // Fallback: find most relevant farm to update
        const farms = await Farm.find({ owner: userId, isActive: true });
        if (!farms.length) return null;

        const targetFarm = farms[0]; // Default to first farm
        await Farm.findByIdAndUpdate(targetFarm._id, {
            healthStatus,
            lastInspection: new Date(),
            $push: {
                images: { diagnosis: diseaseName, confidence, uploadedAt: new Date() },
            },
        });

        return [{ name: targetFarm.name, healthStatus }];
    } catch (e) {
        console.error('Image farm health update error:', e.message);
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════
// POST /api/chat — Text-only message with deterministic health update
// ═══════════════════════════════════════════════════════════════
exports.chat = async (req, res) => {
    try {
        const { message, language = 'en', farmId } = req.body;
        if (!message) {
            return res.status(400).json({ success: false, message: 'Message is required.' });
        }

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey || apiKey === 'your_openai_api_key') {
            return res.status(503).json({ success: false, message: 'AI chatbot service is not configured.' });
        }

        const userId = req.user._id;
        const [farmContext, chatHistory] = await Promise.all([
            getFarmContext(userId),
            getChatHistory(userId),
        ]);

        // ── Deterministic health detection ──
        const healthIntent = detectHealthIntent(message);
        let updatedFarms = null;

        if (healthIntent && farmId) {
            // Direct DB update — no AI involvement needed
            updatedFarms = await updateFarmHealthFromChat(userId, farmId, healthIntent);
        }

        // Build system prompt with extra context if farm is selected
        let farmNote = '';
        if (farmId) {
            const selectedFarm = await Farm.findById(farmId).lean();
            if (selectedFarm) {
                farmNote = `\n\nThe farmer is currently discussing farm: "${selectedFarm.name}" (Crop: ${selectedFarm.cropType}, Health: ${(selectedFarm.healthStatus || 'healthy').replace('_', ' ')}). Focus your answers on this farm specifically.`;
            }
        }

        const systemPrompt = buildSystemPrompt(language, farmContext) + farmNote;
        const recentContext = chatHistory.getRecentContext(8);
        const messages = [
            { role: 'system', content: systemPrompt },
            ...recentContext,
            { role: 'user', content: message },
        ];

        try {
            const response = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                { model: 'llama-3.1-8b-instant', messages, max_tokens: 600, temperature: 0.6 },
                { headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
            );
            const reply = response.data.choices[0].message.content;

            await chatHistory.addMessage('user', message);
            await chatHistory.addMessage('assistant', reply);

            return res.json({ success: true, data: { reply, source: 'groq', updatedFarms } });
        } catch (apiError) {
            console.error('Groq API error:', apiError.response?.data || apiError.message);
            return res.status(502).json({ success: false, message: 'AI assistant is temporarily unavailable.' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// POST /api/chat/image — Image + text with auto farm health update
// ═══════════════════════════════════════════════════════════════
exports.chatWithImage = async (req, res) => {
    try {
        const { message = '', language = 'en', farmId } = req.body;
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please upload an image.' });
        }

        const apiKey = process.env.OPENAI_API_KEY;
        const plantKey = process.env.PLANT_AI_API_KEY;
        const imagePath = req.file.path;
        const imageBase64 = fs.readFileSync(imagePath, { encoding: 'base64' });

        const userId = req.user._id;
        const [farmContext, chatHistory] = await Promise.all([
            getFarmContext(userId),
            getChatHistory(userId),
        ]);

        let diseaseInfo = '';
        let isHealthy = false;
        let confidence = 0;
        let diseaseName = 'Unknown';
        let updatedFarms = null;

        // Step 1: Kindwise API identification
        if (plantKey && plantKey !== 'your_plant_ai_api_key') {
            try {
                const apiUrl = (process.env.PLANT_AI_API_URL || 'https://crop.kindwise.com/api/v1') + '/identification';
                const identRes = await axios.post(apiUrl, {
                    images: [`data:image/jpeg;base64,${imageBase64}`],
                    similar_images: true,
                }, { headers: { 'Api-Key': plantKey, 'Content-Type': 'application/json' } });

                const suggestions = identRes.data?.result?.disease?.suggestions || [];
                isHealthy = identRes.data?.result?.is_healthy?.binary === true;
                diseaseName = isHealthy ? 'Healthy Plant' : (suggestions[0]?.name || 'Unknown');
                confidence = isHealthy
                    ? (identRes.data?.result?.is_healthy?.probability || 0.9)
                    : (suggestions[0]?.probability || 0);

                if (isHealthy) {
                    diseaseInfo = `The plant in the image is HEALTHY (${Math.round(confidence * 100)}% confidence). No disease detected.`;
                } else if (suggestions.length > 0) {
                    const top3 = suggestions.slice(0, 3).map(s => `${s.name} (${(s.probability * 100).toFixed(0)}%)`).join(', ');
                    diseaseInfo = `Disease identified: ${top3}. Most likely: ${suggestions[0].name} (${(suggestions[0].probability * 100).toFixed(0)}% confidence).`;
                    if (suggestions[0].details?.description) {
                        diseaseInfo += ` ${suggestions[0].details.description}`;
                    }
                }

                // Auto-update farm health from image analysis — uses farmId if provided
                updatedFarms = await updateFarmHealthFromImage(userId, farmId, isHealthy, confidence, diseaseName);

            } catch (e) {
                console.error('Kindwise chat-image error:', e.message);
                diseaseInfo = 'Could not identify the plant disease from image automatically.';
            }
        }

        // Step 2: Send to Groq with context
        if (apiKey && apiKey !== 'your_openai_api_key') {
            try {
                let farmUpdateNote = '';
                if (updatedFarms && updatedFarms.length > 0) {
                    farmUpdateNote = `\n[FARM HEALTH UPDATED]: ${updatedFarms.map(f => `${f.name} → ${f.healthStatus.replace('_', ' ')}`).join(', ')}`;
                }

                let farmNote = '';
                if (farmId) {
                    const selectedFarm = await Farm.findById(farmId).lean();
                    if (selectedFarm) {
                        farmNote = ` The farmer selected farm: "${selectedFarm.name}".`;
                    }
                }

                const userMessage = `${diseaseInfo ? `[IMAGE ANALYSIS]: ${diseaseInfo}${farmUpdateNote}${farmNote}\n\n` : ''}User's question about the uploaded crop image: ${message || 'Analyze this crop image. Is it healthy or diseased? What treatment should I use?'}`;
                const systemPrompt = buildSystemPrompt(language, farmContext);
                const recentContext = chatHistory.getRecentContext(6);

                const response = await axios.post(
                    'https://api.groq.com/openai/v1/chat/completions',
                    {
                        model: 'llama-3.1-8b-instant',
                        messages: [
                            { role: 'system', content: systemPrompt },
                            ...recentContext,
                            { role: 'user', content: userMessage },
                        ],
                        max_tokens: 700,
                        temperature: 0.5,
                    },
                    { headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
                );

                try { fs.unlinkSync(imagePath); } catch (e) {}

                const reply = response.data.choices[0].message.content;

                await chatHistory.addMessage('user', `[Uploaded crop image] ${message}`, true);
                await chatHistory.addMessage('assistant', reply);

                return res.json({
                    success: true,
                    data: {
                        reply,
                        source: 'groq',
                        diseaseInfo,
                        isHealthy,
                        diseaseName,
                        confidence,
                        updatedFarms,
                    },
                });
            } catch (apiError) {
                try { fs.unlinkSync(imagePath); } catch (e) {}
                console.error('Groq chat-image error:', apiError.response?.data || apiError.message);
                return res.status(502).json({ success: false, message: 'AI assistant is temporarily unavailable.' });
            }
        }

        try { fs.unlinkSync(imagePath); } catch (e) {}
        return res.status(503).json({ success: false, message: 'AI chatbot is not configured.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/chat/history
exports.getChatHistory = async (req, res) => {
    try {
        const history = await getChatHistory(req.user._id);
        return res.json({ success: true, data: history.messages.slice(-30) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /api/chat/history
exports.clearChatHistory = async (req, res) => {
    try {
        await ChatHistory.findOneAndUpdate(
            { userId: req.user._id },
            { messages: [], lastActive: new Date() }
        );
        return res.json({ success: true, message: 'Chat history cleared.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};