const express = require('express');
const router = express.Router();
const weatherController = require('../controllers/weatherController');
const authenticate = require('../middleware/auth');

router.use(authenticate);
router.get('/', weatherController.getWeather);
router.get('/forecast', weatherController.getForecast);

module.exports = router;
