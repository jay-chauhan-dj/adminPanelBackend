const twilio = require('twilio');  // Import Twilio SDK for interacting with Twilio API
const Logger = require('../../utils/logs/Logger');  // Import Logger class for logging
const MySQL = require('../../utils/db/Mysql');  // Import Mysql class for database operations
const tables = require('../../config/tables');  // Import tables configuration

/**
 * Twilio class handles all WhatsApp operations through Twilio API
 * @author Jay Chauhan
 * @class
 */
class Twilio {
    constructor() {
        this.logger = new Logger();  // Logger instance for logging
        this.db = new MySQL();  // MySQL instance for database operations
        this.accountSid = null;  // Twilio account SID, fetched from database
        this.authToken = null;  // Twilio Auth Token, fetched from database
        this.twilioNumber = null;  // Twilio WhatsApp number, fetched from database
        this.client = null;  // Twilio client for API operations, initialized later
    }

    /**
     * Private method to set up Twilio credentials by fetching from the database
     * @private
     * @async
     * @returns {Promise<boolean>} - Returns true if setup is successful, false otherwise
     */
    async #setup() {
        try {
            await this.db.connect();

            const twilioCredentials = await this.db.table(tables.TBL_WHATSAPP_CLIENTS)
                .select('clientAccountId', 'clientApiKey', 'clientWhatsppNumber')
                .where('clientName', 'Twilio')
                .where('clientIsActive', '1')
                .first();

            if (twilioCredentials) {
                this.accountSid = twilioCredentials.clientAccountId;
                this.authToken = twilioCredentials.clientApiKey;
                this.twilioNumber = "+91" + twilioCredentials.clientWhatsppNumber;
                this.client = twilio(this.accountSid, this.authToken);
                return true;  // Setup successful
            } else {
                this.logger.error('Twilio credentials not found in the database', 'twilio/error');
                return false;  // Setup failed
            }
        } catch (error) {
            this.logger.write("Something went wrong in setup: " + error, "twilio/error");
            return false;  // Setup failed
        }
    }

    /**
     * Method to create a WhatsApp message template using Twilio Content Template Builder
     * @param {string} templateName - Name of the template
     * @param {string} body - Template body
     * @param {Object} variables - Variables to be included in the template
     * @returns {Promise<Object>} - The response from Twilio API
     */
    async createTemplate(templateName, body, variables) {
        const setupSuccess = await this.#setup();  // Call setup to initialize Twilio client
        if (!setupSuccess) return;  // Exit if setup failed

        try {
            const response = await this.client.content.templates.create({
                name: templateName,
                body: body,
                variables: variables
            });
            this.logger.write("Template created: " + templateName, "twilio/success");
            return response;
        } catch (error) {
            this.logger.write("Error creating template: " + error, "twilio/error");
            throw error;
        }
    }

    /**
     * Method to get the status of an existing WhatsApp template
     * @param {string} templateSid - The SID of the template
     * @returns {Promise<Object>} - The template status
     */
    async getTemplateStatus(templateSid) {
        const setupSuccess = await this.#setup();  // Call setup to initialize Twilio client
        if (!setupSuccess) return;  // Exit if setup failed

        try {
            const response = await this.client.content.templates(templateSid).fetch();
            this.logger.write("Fetched template status for SID: " + templateSid, "twilio/success");
            return response;
        } catch (error) {
            this.logger.write("Error fetching template status: " + error, "twilio/error");
            throw error;
        }
    }

    /**
     * Method to send a WhatsApp template message
     * @param {string} to - Recipient's WhatsApp number
     * @param {string} templateSid - The SID of the template
     * @param {Object} templateParams - Template parameters (values for placeholders)
     * @returns {Promise<Object>} - The message response from Twilio API
     */
    async sendTemplateMessage(to, templateSid, templateParams) {
        console.log([to, templateSid, templateParams]);
        const setupSuccess = await this.#setup();  // Call setup to initialize Twilio client
        if (!setupSuccess) return;  // Exit if setup failed

        try {
            const message = await this.client.messages.create({
                from: `whatsapp:${this.twilioNumber}`,
                to: `whatsapp:+${to}`,
                contentSid: templateSid,
                contentVariables: JSON.stringify(templateParams),
            });
            this.logger.write(`Template message sent to ${to}`, 'twilio/success');
            return message;
        } catch (error) {
            this.logger.write(`Error sending template message to ${to}: ${error}`, 'twilio/error');
            throw error;
        }
    }

    /**
     * Method to receive incoming WhatsApp messages using a Twilio webhook and insert them into the database
     * @param {Object} req - Express.js request object (containing the incoming message)
     * @returns {Promise<Object>} - The received message data
     */
    async receiveMessage(data) {
        const setupSuccess = await this.#setup();  // Call setup to initialize Twilio client
        if (!setupSuccess) return;  // Exit if setup failed

        try {
            const message = data.Body;  // Extract the incoming message body
            const from = data.From;  // Extract the sender's number

            this.logger.write(`Received WhatsApp message from ${from}: ${message}`, 'twilio/incoming');

            // Insert received message into the database
            await this.db.table(tables.TBL_RECEIVED_MESSAGES)
                .insert({
                    sender: from,
                    message_body: message,
                    received_at: new Date()
                });

            this.logger.write(`Inserted received message from ${from} into the database`, 'twilio/db-success');
            return { from, message };
        } catch (error) {
            this.logger.write("Error receiving and inserting message: " + error, "twilio/error");
            throw error;
        }
    }

    /**
     * Method to fetch all created templates from Twilio and insert them into the database
     * @returns {Promise<Array>} - List of templates
     */
    async getAllTemplates() {
        const setupSuccess = await this.#setup();  // Call setup to initialize Twilio client
        if (!setupSuccess) return;  // Exit if setup failed

        try {
            const templates = await this.client.content.templates.list();
            this.logger.write("Fetched all created templates", 'twilio/success');

            for (const template of templates) {
                await this.db.table(tables.TBL_TEMPLATES)
                    .insert({
                        template_sid: template.sid,
                        template_name: template.name,
                        template_body: template.body,
                        created_at: new Date()
                    });
            }

            this.logger.write("Inserted fetched templates into the database", 'twilio/db-success');
            return templates;
        } catch (error) {
            this.logger.write("Error fetching and inserting templates: " + error, "twilio/error");
            throw error;
        }
    }
}

// Export Twilio class for use in other modules
module.exports = Twilio;
