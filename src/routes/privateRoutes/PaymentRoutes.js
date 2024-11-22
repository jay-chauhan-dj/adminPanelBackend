const express = require('express');
const router = express.Router();
const PaymentController = require('../../controllers/PaymentController');

// Money routes
router.post("/payment-link/create", PaymentController.createPaymentLink);

// Export Router
module.exports = router;