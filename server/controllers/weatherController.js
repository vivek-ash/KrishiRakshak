/**
 * Weather Controller
 * Fetches real-time weather data from OpenWeather API
 */
const axios = require('axios');

// GET /api/weather?lat=XX&lon=XX — Get current weather
exports.getWeather = async (req, res) => {
    try {
        const { lat, lon } = req.query;
        if (!lat || !lon) {
            return res.status(400).json({ success: false, message: 'Latitude and longitude required.' });
        }

        const apiKey = process.env.OPENWEATHER_API_KEY;

        if (!apiKey || apiKey === 'your_openweather_api_key') {
            return res.status(503).json({ success: false, message: 'Weather service is not configured.' });
        }

        const response = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
        );
        return res.json({ success: true, data: response.data, source: 'openweather' });
    } catch (error) {
        console.error('Weather API error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch weather data.' });
    }
};

// GET /api/weather/forecast?lat=XX&lon=XX — Get 5-day forecast
exports.getForecast = async (req, res) => {
    try {
        const { lat, lon } = req.query;
        if (!lat || !lon) {
            return res.status(400).json({ success: false, message: 'Latitude and longitude required.' });
        }

        const apiKey = process.env.OPENWEATHER_API_KEY;

        if (!apiKey || apiKey === 'your_openweather_api_key') {
            return res.status(503).json({ success: false, message: 'Weather service is not configured.' });
        }

        const response = await axios.get(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
        );
        return res.json({ success: true, data: response.data, source: 'openweather' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch forecast.' });
    }
};
