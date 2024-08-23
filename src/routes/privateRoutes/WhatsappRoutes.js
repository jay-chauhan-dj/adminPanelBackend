const express = require('express');
const router = express.Router();
const WhatsappController = require('../../controllers/WhatsappController');

// Whatsapp messages
router.post("/send", WhatsappController.sendMessage);

// Export Router
module.exports = router;