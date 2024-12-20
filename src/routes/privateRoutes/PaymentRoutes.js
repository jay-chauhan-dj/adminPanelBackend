const express = require('express');
const router = express.Router();
const PaymentController = require('../../controllers/PaymentController');

// Money routes
router.post("/payment-link/create", PaymentController.createPaymentLink);
router.post("/payout-link/create", PaymentController.createPayoutLink);
router.get("/types", PaymentController.getPaymentTypes);

// Export Router
module.exports = router;