const express = require('express');
const LoginController = require('../controllers/LoginController');
const RoutesController = require('../controllers/RoutesController');
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

module.exports = router;