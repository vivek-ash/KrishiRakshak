/**
 * Alert Controller — production mode (no demo fallback)
 */
const Alert = require('../models/Alert');

exports.createAlert = async (req, res) => {
    try {
        const alertData = { ...req.body, createdBy: req.user._id };

        // Remove targetLocation if no valid coordinates — prevents geo index error
        if (!alertData.targetLocation?.coordinates?.length) {
            delete alertData.targetLocation;
        }

        const alert = await Alert.create(alertData);
        const io = req.app.get('io');
        if (io) io.emit('new-alert', alert);
        return res.status(201).json({ success: true, data: alert });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getAlerts = async (req, res) => {
    try {
        const { page = 1, limit = 20, severity, type } = req.query;
        const query = { isActive: true };
        if (severity) query.severity = severity;
        if (type) query.type = type;
        if (req.user.role === 'farmer') {
            query.$or = [{ sendToAll: true }, { targetFarmers: req.user._id }, { targetFarmers: { $size: 0 } }];
        }
        const alerts = await Alert.find(query).populate('createdBy', 'name').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
        const total = await Alert.countDocuments(query);
        return res.json({ success: true, data: alerts, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getAlert = async (req, res) => {
    try {
        const alert = await Alert.findById(req.params.id).populate('createdBy', 'name email');
        if (!alert) return res.status(404).json({ success: false, message: 'Alert not found.' });
        return res.json({ success: true, data: alert });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.updateAlert = async (req, res) => {
    try {
        const alert = await Alert.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        return res.json({ success: true, data: alert });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.deleteAlert = async (req, res) => {
    try {
        await Alert.findByIdAndUpdate(req.params.id, { isActive: false });
        return res.json({ success: true, message: 'Alert deactivated.' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getAlertStats = async (req, res) => {
    try {
        const total = await Alert.countDocuments({ isActive: true });
        const critical = await Alert.countDocuments({ isActive: true, severity: 'critical' });
        const thisWeek = await Alert.countDocuments({ isActive: true, createdAt: { $gte: new Date(Date.now() - 7 * 86400000) } });
        const bySeverity = await Alert.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$severity', count: { $sum: 1 } } }]);
        const byType = await Alert.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$type', count: { $sum: 1 } } }]);
        return res.json({ success: true, data: { total, critical, thisWeek, bySeverity, byType } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};