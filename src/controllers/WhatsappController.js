const Logger = require('../utils/logs/Logger'); // Import the Logger utility for logging
const Whatsapp = require('../utils/whatsapp/Whatsapp'); // Import the Whatsapp utility for sending Whatsapp messages
const Twilio = require('../providers/twilio/class-twilio');
const WhatsappService = require('../services/WhatsappService');

/**
 * @class WhatsappController
 * @description Controller class for handling Whatsapp-related operations such as sending Whatsapp messages.
 *              This class contains static methods that interact with the Whatsapp utility and handle HTTP requests and responses.
 * @version 1.0.0
 * @date 2024-07-30
 * @author Jay Chauhan
 */
class WhatsappController {
    /**
     * @function sendMessage
     * @description Sends a Whatsapp message using the Whatsapp utility.
     * @param {Object} req - The HTTP request object.
     * @param {Object} res - The HTTP response object.
     */
    static async sendMessage(req, res) {
        const clientId = 1; // Client ID for the Whatsapp service
        const whatsappNumber = req.body.whatsappNumber; // Get the recipient's Whatsapp number from the request body
        const name = req.body.name; // Get the recipient's name from the request body
        const templateName = req.body.templateName; // Get the template name from the request body
        const templateData = req.body.templateData; // Get the template data from the request body

        const whatsapp = new Whatsapp(); // Create a new instance of the Whatsapp utility
        try {
            const response = await whatsapp.sendTemplateMessage(clientId, templateName, whatsappNumber, name, templateData); // Send the Whatsapp message using the specified template and data

            const logger = new Logger(); // Create a new instance of the Logger utility
            const details = {
                clientId: clientId,
                templateName: templateName,
                whatsappNumber: whatsappNumber,
                name: name,
                templateData: templateData,
                response: response
            };
            logger.write(JSON.stringify(details), 'whatsapp/send'); // Log the message details

            res.status(200).json({ message: 'Whatsapp sent successfully!', response: response }); // Send a success response with the Whatsapp service response
        } catch (error) {
            const logger = new Logger(); // Create a new instance of the Logger utility
            logger.write("Error in sending Whatsapp message: " + error, "whatsapp/error"); // Log the error
            res.status(500).json({ message: 'Oops! Something went wrong!' }); // Send an error response
        }
    }

    static async sendTemplate(req, res) {
        const twilio = new Twilio();
        const response = await twilio.sendTemplateMessage('919664788574', 'HX8e2771b25207d1bb0d5d219058af9f45', { 1: 'Jay Chauhan' });
        res.status(200).json({ message: 'Whatsapp sent successfully!', response: response }); // Send a success response with the Whatsapp service response
    }

    static async sendFreeMessage(req, res) {
        const whatsapp = new WhatsappService();
        const response = await whatsapp.sendTemplateMessage('919664788574', '1', ['Jay Chauhan']);
        console.log(response);

        res.status(200).json({ message: 'Whatsapp sent successfully!', response: response }); // Send a success response with the Whatsapp service response
    }

    static async getMessage(req, res) {
        const logger = new Logger(); // Create a new instance of the Logger utility
        logger.write("Got inbound message: " + JSON.stringify(req.body), "whatsapp/get");
        res.status(200).json({ message: 'Whatsapp sent successfully!' }); // Send a success response with the Whatsapp service response
    }
}

module.exports = WhatsappController; // Export the WhatsappController class
