/**
 * Farm Routes — with photo upload support
 */
const express = require('express');
const router = express.Router();
const farmController = require('../controllers/farmController');
const authenticate = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const multer = require('multer');
const path = require('path');

// Multer config for farm photos
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../../public/uploads/farms')),
    filename: (req, file, cb) => cb(null, `farm_${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|webp/;
        const ext = allowed.test(path.extname(file.originalname).toLowerCase());
        const mime = allowed.test(file.mimetype);
        cb(ext && mime ? null : new Error('Only images allowed'), ext && mime);
    },
});

router.use(authenticate); // All farm routes require auth

router.get('/stats/overview', farmController.getFarmStats);
router.get('/all', roleCheck('admin'), farmController.getAllFarms);
router.get('/', farmController.getMyFarms);
router.post('/', farmController.createFarm);
router.get('/:id', farmController.getFarm);
router.put('/:id', farmController.updateFarm);
router.delete('/:id', farmController.deleteFarm);

// Farm photo upload
router.post('/:id/photo', upload.single('farmPhoto'), farmController.uploadFarmPhoto);

module.exports = router;
