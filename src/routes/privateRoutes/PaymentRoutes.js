const express = require('express');
const router = express.Router();
const PaymentController = require('../../controllers/PaymentController');

// Money routes
router.get("/payment", PaymentController.getPaymentDetails);

// Export Router
module.exports = router;