const express = require('express');
const router = express.Router();
const WhatsappController = require('../../controllers/WhatsappController');

// Whatsapp messages
router.post("/send", WhatsappController.sendMessage);
router.post("/sendTemplate", WhatsappController.sendTemplate);

// Export Router
module.exports = router;