const express = require('express');
const router = express.Router();
const WhatsappController = require('../../controllers/WhatsappController');

// Whatsapp messages
router.post("/send", WhatsappController.sendMessage);
router.post("/sendTemplate", WhatsappController.sendTemplate);
router.post("/sendMessage", WhatsappController.sendFreeMessage);
router.get("/getWhatsappMessages", WhatsappController.getWhatsappMessages);

// Export Router
module.exports = router;