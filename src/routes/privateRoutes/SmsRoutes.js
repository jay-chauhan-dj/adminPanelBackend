const express = require('express');
const router = express.Router();
const SmsController = require('../../controllers/SmsController');

// Sms Routes

// Sms routes [FRONTEND DATA GETTING API]
router.get("/getSms", SmsController.getSms);

// Sms import [BACKEND DATA RETRIVING API]
router.post("/receiveSms", SmsController.receiveSms);

// Export Router
module.exports = router;