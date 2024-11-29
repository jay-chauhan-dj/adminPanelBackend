const express = require('express');
const LoginController = require('../controllers/LoginController');
const RoutesController = require('../controllers/RoutesController');
const PaymentRoutes = require('./privateRoutes/PaymentRoutes');
const WhatsappController = require('../controllers/WhatsappController');
const PaymentController = require('../controllers/PaymentController');
const router = express.Router();

/*********************************************************************************************
 * Public routes 
 *********************************************************************************************/

// Login Routes
router.post('/sendOtp', LoginController.sendOtp);
router.post('/login', LoginController.login);

// Email Verification Route
router.post('/verifyEmail', LoginController.sendVerificationMail);
router.get('/verifyEmail/:token', LoginController.verifyEmail);

// React Routes
router.get('/routes', RoutesController.getRoutes);

// Payment routes
router.post("/payment", PaymentController.getPaymentDetails);

// Whatsapp routes
router.post("/whatsapp/inbound", WhatsappController.getMessage);
router.get("/whatsapp/sendTaskNotification", WhatsappController.sendTaskNotification);

module.exports = router;