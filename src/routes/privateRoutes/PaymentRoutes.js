const express = require('express');
const router = express.Router();
const PaymentController = require('../../controllers/PaymentController');

// Money routes
router.post("/payment-link/create", PaymentController.createPaymentLink);
router.post("/payout-link/create", PaymentController.createPayoutLink);

// Export Router
module.exports = router;