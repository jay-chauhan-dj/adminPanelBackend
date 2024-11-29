const MySQL = require('../utils/db/Mysql'); // Import the MySQL utility for database operations
const tables = require('../config/tables'); // Import table configurations
const Logger = require('../utils/logs/Logger'); // Import the Logger utility for logging
const PaymentService = require('../services/payment/PaymentService');

/**
 * @class PaymentController
 * @description Controller class for handling payments fetching details.
 * @version 1.0.0
 * @date 2024-07-30
 * @author Jay Chauhan
 */
class PaymentController {
    static async getPaymentDetails(req, res) {
        const logger = new Logger(); // Create a new instance of the Logger utility
        logger.write("Url Details: " + JSON.stringify(req.originalUrl), "payments/payment"); // Log the error
        logger.write("Headers Details: " + JSON.stringify(req.rawHeaders), "payments/payment"); // Log the error
        logger.write("Payment Details: " + JSON.stringify(req.body), "payments/payment"); // Log the error

        const payment = new PaymentService(false);
        await payment.handleWebhook(req.body);
        res.status(200).json({ message: 'Details logged successfully!' }); // Send an success response
    }

    static async createPaymentLink(req, res) {
        const payment = new PaymentService(false);
        const data = req.body;
        const linkConfig = {
            amount: data.amount,
            linkExpiryTime: data.linkExpiryTime,
            linkPurpose: data.linkPurpose,
            linkNotify: data.linkNotify,
        };
        const paymentLink = await payment.createPaymentLink(linkConfig, data.contactId, data.linkType);
        res.status(200).json({ message: 'Details logged successfully!', data: paymentLink });
    }
}

module.exports = PaymentController; // Export the RoutesController class
