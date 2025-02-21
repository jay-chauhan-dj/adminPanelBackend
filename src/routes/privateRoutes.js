const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const DashboardRoutes = require('./privateRoutes/DashboardRoutes');
const SmsRoutes = require('./privateRoutes/SmsRoutes');
const MenuRoutes = require('./privateRoutes/MenuRoutes');
const EmailRoutes = require('./privateRoutes/EmailRoutes');
const WhatsappRoutes = require('./privateRoutes/WhatsappRoutes');
const MoneyRoutes = require('./privateRoutes/MoneyRoutes');
const PaymentRoutes = require('./privateRoutes/PaymentRoutes');
const VerifyUserRoutes = require('./privateRoutes/VerifyUserRoutes');
const EventRoutes = require('./privateRoutes/EventRoutes');
const ContactRoutes = require('./privateRoutes/ContactRoutes');
const DirectoryRoutes = require('./privateRoutes/DirectoryRoutes');
const Logger = require('../utils/logs/Logger');

/*********************************************************************************************
 * Private routes 
 *********************************************************************************************/

// Authentication Middleware To Velidate The Request
router.use(authMiddleware);

// Dashboard routes
router.use("/dashboard", DashboardRoutes);

// Sms routes
router.use("/sms", SmsRoutes);

// Menu routes
router.use("/menu", MenuRoutes);

// Email routes
router.use("/email", EmailRoutes);

// Whatsapp routes
router.use("/whatsapp", WhatsappRoutes);

// Money routes
router.use("/money", MoneyRoutes);

// Money routes
router.use("/event", EventRoutes);

// Payment routes
router.use("/payment", PaymentRoutes);

// 2FA routes
router.use("/2fa", VerifyUserRoutes);

// Contacts routes
router.use("/contact", ContactRoutes);

// Directory routes
router.use("/nas", DirectoryRoutes);

// Clean Logs
router.post("/clearLogs", (req, res) => {
    const logger = new Logger();
    logger.cleanupLogs();
    res.status(200).json({ message: "Logs cleaned up successfully" });
});

// Export Private Router
module.exports = router;