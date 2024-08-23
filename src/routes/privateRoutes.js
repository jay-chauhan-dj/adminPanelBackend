const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const DashboardRoutes = require('./privateRoutes/DashboardRoutes');
const SmsRoutes = require('./privateRoutes/SmsRoutes');
const MenuRoutes = require('./privateRoutes/MenuRoutes');
const EmailRoutes = require('./privateRoutes/EmailRoutes');
const WhatsappRoutes = require('./privateRoutes/WhatsappRoutes');
const MoneyRoutes = require('./privateRoutes/MoneyRoutes');
const EventRoutes = require('./privateRoutes/EventRoutes');
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

// Clean Logs
router.post("/clearLogs", (req, res) => {
    const logger = new Logger();
    logger.cleanupLogs();
    res.status(200).json({ message: "Logs cleaned up successfully" });
});

// Export Private Router
module.exports = router;