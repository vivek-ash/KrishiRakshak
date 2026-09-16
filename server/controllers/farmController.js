/**
 * Farm Controller — with photo upload and secondary crops
 */
const Farm = require('../models/Farm');
const path = require('path');
const fs = require('fs');

exports.createFarm = async (req, res) => {
    try {
        const farmData = { ...req.body, owner: req.user._id };

        // Handle secondaryCrops from comma-separated string
        if (typeof farmData.secondaryCrops === 'string') {
            farmData.secondaryCrops = farmData.secondaryCrops
                .split(',')
                .map(c => c.trim())
                .filter(Boolean);
        }

        const farm = await Farm.create(farmData);
        return res.status(201).json({ success: true, data: farm });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getMyFarms = async (req, res) => {
    try {
        const farms = await Farm.find({ owner: req.user._id, isActive: true }).sort({ createdAt: -1 });
        return res.json({ success: true, data: farms });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getAllFarms = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const farms = await Farm.find({ isActive: true }).populate('owner', 'name email phone address').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
        const total = await Farm.countDocuments({ isActive: true });
        return res.json({ success: true, data: farms, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getFarm = async (req, res) => {
    try {
        const farm = await Farm.findById(req.params.id).populate('owner', 'name email');
        if (!farm) return res.status(404).json({ success: false, message: 'Farm not found.' });
        return res.json({ success: true, data: farm });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.updateFarm = async (req, res) => {
    try {
        const updateData = { ...req.body };

        // Handle secondaryCrops from comma-separated string
        if (typeof updateData.secondaryCrops === 'string') {
            updateData.secondaryCrops = updateData.secondaryCrops
                .split(',')
                .map(c => c.trim())
                .filter(Boolean);
        }

        const farm = await Farm.findOneAndUpdate(
            { _id: req.params.id, owner: req.user._id },
            updateData,
            { new: true, runValidators: true }
        );
        if (!farm) return res.status(404).json({ success: false, message: 'Farm not found or access denied.' });
        return res.json({ success: true, data: farm });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.deleteFarm = async (req, res) => {
    try {
        const farm = await Farm.findOneAndUpdate(
            { _id: req.params.id, owner: req.user._id },
            { isActive: false },
            { new: true }
        );
        if (!farm) return res.status(404).json({ success: false, message: 'Farm not found or access denied.' });
        return res.json({ success: true, message: 'Farm deleted.' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getFarmStats = async (req, res) => {
    try {
        const query = req.user.role === 'farmer' ? { owner: req.user._id, isActive: true } : { isActive: true };
        const totalFarms = await Farm.countDocuments(query);
        const healthCounts = await Farm.aggregate([{ $match: query }, { $group: { _id: '$healthStatus', count: { $sum: 1 } } }]);
        const cropCounts = await Farm.aggregate([{ $match: query }, { $group: { _id: '$cropType', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]);
        return res.json({ success: true, data: { totalFarms, healthCounts, cropCounts } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// Upload farm cover photo
exports.uploadFarmPhoto = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please upload an image.' });
        }

        const photoUrl = `/uploads/farms/${req.file.filename}`;

        // Delete old photo if exists
        const oldFarm = await Farm.findOne({ _id: req.params.id, owner: req.user._id });
        if (oldFarm?.farmPhoto && oldFarm.farmPhoto.startsWith('/uploads/')) {
            const oldPath = path.join(__dirname, '../../public', oldFarm.farmPhoto);
            try { fs.unlinkSync(oldPath); } catch (e) {}
        }

        const farm = await Farm.findOneAndUpdate(
            { _id: req.params.id, owner: req.user._id },
            { farmPhoto: photoUrl },
            { new: true }
        );

        if (!farm) {
            try { fs.unlinkSync(req.file.path); } catch (e) {}
            return res.status(404).json({ success: false, message: 'Farm not found.' });
        }

        return res.json({ success: true, data: farm });
    } catch (error) {
        try { if (req.file) fs.unlinkSync(req.file.path); } catch (e) {}
        res.status(500).json({ success: false, message: error.message });
    }
};
