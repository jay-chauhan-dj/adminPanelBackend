const Twilio = require('../providers/twilio/class-twilio');  // Import the Twilio class for Twilio API interactions
const Logger = require('../utils/logs/Logger');  // Import Logger class for logging purposes
const MySQL = require('../utils/db/Mysql');  // Import MySQL class for database operations
const tables = require('../config/tables');  // Import table configuration constants

/**
 * WhatsappService class handles all WhatsApp operations through Twilio API.
 * Manages sending both freeform and template-based messages, logs message details, 
 * and interacts with the database to store message data.
 */
class WhatsappService {
    /**
     * Constructor initializes instances of Logger, MySQL, and Twilio.
     */
    constructor() {
        this.logger = new Logger();  // Initialize Logger instance for logging
        this.db = new MySQL();  // Initialize MySQL instance for database operations
        this.twilio = new Twilio();  // Initialize Twilio instance for Twilio API operations
    }

    /**
     * Sends a freeform WhatsApp message using Twilio API.
     * Logs the message details into the database after sending.
     * @param {string} to - Recipient's WhatsApp number.
     * @param {string} body - Message body to be sent.
     * @returns {Promise<void>} No return value, performs operations asynchronously.
     */
    async sendMessage(to, body) {
        try {
            // Send freeform message using Twilio API
            const response = await this.twilio.sendFreeformMessage(to, body);

            // Prepare message details for database insertion
            const messageDetails = {
                whatsappMessageId: response.sid,  // Unique message ID from Twilio
                messageFrom: response.from.split(':')[1],  // Extract sender number from Twilio response
                messageTo: response.to.split(':')[1],  // Extract recipient number from Twilio response
                messageBody: response.body,  // Message content
                messageType: "0",  // Message type (0 indicates freeform message)
            };

            // Connect to the database, insert message details, then disconnect
            await this.db.connect();
            await this.db.table(tables.TBL_WHATSAPP_MESSAGES).insert(messageDetails);
            await this.db.disconnect();

            // Log successful message sending
            this.logger.info(`WhatsApp message sent to ${to}: ${body}`, 'whatsapp/message');
        } catch (error) {
            // Log error if message sending fails
            this.logger.error(`Failed to send WhatsApp message to ${to}: ${error}`, 'whatsapp/error');
        }
    }

    /**
     * Sends a template-based WhatsApp message using Twilio API.
     * Retrieves the template from the database and verifies the parameter count before sending.
     * Logs the message details into the database after sending.
     * @param {string} to - Recipient's WhatsApp number.
     * @param {string} templateId - The ID of the template to use.
     * @param {Array} templateParams - Parameters to populate the template variables.
     * @returns {Promise<boolean>} Returns true if the message was sent successfully, false otherwise.
     */
    async sendTemplateMessage(to, templateId, templateParams) {
        try {
            // Connect to the database to fetch template data based on templateId
            await this.db.connect();
            const templateData = await this.db.table(tables.TBL_WHATSAPP_TEMPLATES)
                .select('templateWhatsappClientIdentifier as templateSid', 'templateVariableCount as paramCount')
                .where('templateId', templateId)
                .where('templateIsActive', '1')
                .first();
            await this.db.disconnect();

            // Check if template data exists
            if (templateData) {
                // Check if the provided parameters match the expected variable count for the template
                if (templateParams.length == templateData.paramCount) {
                    let templateVariables = {};
                    let i = 1;
                    // Populate template variables based on the parameter count
                    templateParams.forEach(element => {
                        templateVariables[i] = element;
                        i++;
                    });

                    // Send the template message using Twilio API
                    const response = await this.twilio.sendTemplateMessage(to, templateData.templateSid, templateVariables);
                    this.logger.write(JSON.stringify(response), 'whatsapp/sent');  // Log the response

                    // Prepare message details for database insertion
                    const messageDetails = {
                        whatsappMessageId: response.sid,  // Unique message ID from Twilio
                        messageFrom: response.from.split(':')[1],  // Extract sender number
                        messageTo: response.to.split(':')[1],  // Extract recipient number
                        messageBody: response.body,  // Message content
                        messageType: "0",  // Message type (0 for sent message)
                    };

                    // Insert the message details into the database
                    await this.db.connect();
                    await this.db.table(tables.TBL_WHATSAPP_MESSAGES).insert(messageDetails);
                    await this.db.disconnect();

                    return true;  // Message sent successfully
                } else {
                    // Log an error if parameter count mismatches
                    this.logger.write(`Failed to send WhatsApp message to ${to}: variable count mismatch!`, 'whatsapp/error');
                    return false;  // Failure due to mismatched parameter count
                }
            } else {
                // Log an error if the template is not found
                this.logger.write(`Template not found for ID: ${templateId}`, 'whatsapp/error');
                return false;  // Failure due to missing template
            }
        } catch (error) {
            // Log any error encountered during the process
            this.logger.write(`Failed to send WhatsApp message to ${to}: ${error}`, 'whatsapp/error');
            return false;  // Failure due to error
        }
    }

    /**
     * Retrieves the template ID from the database by its name.
     * @param {string} name - Name of the template to fetch the ID for.
     * @returns {Promise<Object>} Returns the template ID or null if not found.
     */
    async getTemplateIdByName(name) {
        try {
            // Connect to the database and fetch the template ID based on the template name
            await this.db.connect();
            const templateId = await this.db.table(tables.TBL_WHATSAPP_TEMPLATES)
                .select('templateId')
                .where('templateName', name)
                .where('templateIsActive', '1')
                .first();
            await this.db.disconnect();

            return templateId;  // Return the fetched template ID
        } catch (error) {
            // Log any error encountered during the process
            this.logger.write(`Failed to fetch template ID for ${name}: ${error}`, 'whatsapp/error');
            return false;  // Failure due to error
        }
    }


    /**
     * Saves the details of a received WhatsApp message into the database.
     * Extracts relevant information from the message data and stores it in the database.
     * @param {Object} data - The received message data from Twilio webhook.
     * @returns {Promise<boolean>} Returns true if the message was saved successfully, false otherwise.
     */
    async saveReceivedMessage(data) {
        try {
            if (data.SmsStatus == 'received') {
                // Prepare message details for insertion into the database
                const messageDetails = {
                    whatsappMessageId: data.MessageSid,  // Unique message ID from Twilio, used for tracking
                    messageFrom: data.From.split(':')[1],  // Extract and clean up sender's phone number (removes 'whatsapp:')
                    messageTo: data.To.split(':')[1],  // Extract and clean up recipient's phone number (removes 'whatsapp:')
                    messageBody: data.Body,  // The actual text content of the received message
                    messageType: "1",  // Message type is '1', indicating a received message (as opposed to sent)
                };

                // Insert the message details into the database
                await this.db.connect();  // Connect to the database
                await this.db.table(tables.TBL_WHATSAPP_MESSAGES).insert(messageDetails);  // Insert the message details into the specified table
                await this.db.disconnect();  // Disconnect from the database once done

                return true;  // Return true indicating that the message was successfully saved
            } else {
                return true;  // Return true indicating that the message was successfully saved
            }
        } catch (error) {
            // Log any error that occurs during the process
            this.logger.write(`Failed to save received message: ${error}`, 'whatsapp/error');
            return false;  // Return false to indicate failure due to the error
        }
    }

}

// Export the WhatsappService class for use in other modules
module.exports = WhatsappService;
