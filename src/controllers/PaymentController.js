const Logger = require('../utils/logs/Logger'); // Import the Logger utility for logging
const PaymentService = require('../services/payment/PaymentService');
const { getOption } = require('../utils/functions');

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
        res.status(200).json({ success: true, message: 'Link created successfully!', data: paymentLink });
    }

    static async createPayoutLink(req, res) {
        const payment = new PaymentService(true);
        const data = req.body;
        const linkConfig = {
            amount: data.amount,
            linkPurpose: data.linkPurpose,
            type: data.type,
            description: data.description,
            upiId: data.upiId,
            bankDetails: data.bankDetails,
            cardDetails: data.cardDetails,
        };
        const paymentLink = await payment.createPayoutLink(linkConfig, data.contactId, data.linkType);
        res.status(200).json({ message: 'Details logged successfully!', data: paymentLink });
    }

    static async getPaymentTypes(req, res) {
        const types = await getOption("paymentLinkIdPrefix");
        res.status(200).json({ success: true, data: JSON.parse(types) });
    }
}

module.exports = PaymentController; // Export the RoutesController class
