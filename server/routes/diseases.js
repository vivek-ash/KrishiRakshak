/**
 * Disease Routes
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const diseaseController = require('../controllers/diseaseController');
const authenticate = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Multer config for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
    filename: (req, file, cb) => cb(null, `disease-${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
    const types = /jpeg|jpg|png|webp/;
    if (types.test(path.extname(file.originalname).toLowerCase()) && types.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files allowed.'));
}});

router.use(authenticate);

router.get('/', diseaseController.getDiseases);
router.get('/:id', diseaseController.getDisease);
router.post('/', roleCheck('admin'), diseaseController.createDisease);
router.put('/:id', roleCheck('admin'), diseaseController.updateDisease);
router.delete('/:id', roleCheck('admin'), diseaseController.deleteDisease);
router.post('/detect', upload.single('image'), diseaseController.detectDisease);
router.post('/predict', diseaseController.predictDisease);

module.exports = router;
