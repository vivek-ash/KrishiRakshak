/**
 * Alert Routes
 */
const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const authenticate = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(authenticate);

router.get('/stats/overview', alertController.getAlertStats);
router.get('/', alertController.getAlerts);
router.get('/:id', alertController.getAlert);
router.post('/', roleCheck('admin'), alertController.createAlert);
router.put('/:id', roleCheck('admin'), alertController.updateAlert);
router.delete('/:id', roleCheck('admin'), alertController.deleteAlert);

module.exports = router;
