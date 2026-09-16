/**
 * Chat Routes — text, image, and history
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const chatController = require('../controllers/chatController');
const authenticate = require('../middleware/auth');

// Multer config for chat image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
    filename: (req, file, cb) => cb(null, `chat-${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const types = /jpeg|jpg|png|webp/;
        if (types.test(path.extname(file.originalname).toLowerCase()) && types.test(file.mimetype)) cb(null, true);
        else cb(new Error('Only image files allowed.'));
    },
});

router.use(authenticate);
router.post('/', chatController.chat);
router.post('/image', upload.single('image'), chatController.chatWithImage);
router.get('/history', chatController.getChatHistory);
router.delete('/history', chatController.clearChatHistory);

module.exports = router;
