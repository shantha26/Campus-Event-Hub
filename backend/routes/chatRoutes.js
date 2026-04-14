const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// POST /api/chat/ask
router.post('/ask', chatController.askGemini);

module.exports = router;
