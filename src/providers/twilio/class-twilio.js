const twilio = require('twilio');  // Import Twilio SDK for interacting with Twilio API
const Logger = require('../../utils/logs/Logger');  // Import Logger class for logging purposes
const MySQL = require('../../utils/db/Mysql');  // Import Mysql class for database operations
const tables = require('../../config/tables');  // Import table configuration constants

/**
 * Twilio class handles all WhatsApp operations through Twilio API.
 * Provides functionality for sending, receiving messages, managing templates, 
 * and interacting with the database to store received messages and template data.
 * @author Jay Chauhan
 */
class Twilio {
    /**
     * Constructor initializes logger, MySQL instance, and placeholder variables 
     * for Twilio account credentials and client instance.
     */
    constructor() {
        this.logger = new Logger();  // Initialize logger instance for logging
        this.db = new MySQL();  // Initialize MySQL instance for database operations
        this.accountSid = null;  // Placeholder for Twilio Account SID, fetched from database
        this.authToken = null;  // Placeholder for Twilio Auth Token, fetched from database
        this.twilioNumber = null;  // Placeholder for Twilio WhatsApp number, fetched from database
        this.client = null;  // Placeholder for Twilio client, initialized after fetching credentials
    }

    /**
     * Private method to set up Twilio credentials by fetching them from the database.
     * Initializes the Twilio client using the fetched credentials.
     * @returns {Promise<boolean>} Returns true if setup is successful, false otherwise.
     */
    async #setup() {
        try {
            // Connect to the database
            await this.db.connect();

            // Fetch Twilio credentials from the database
            const twilioCredentials = await this.db.table(tables.TBL_WHATSAPP_CLIENTS)
                .select('clientAccountId', 'clientApiKey', 'clientWhatsppNumber')
                .where('clientName', 'Twilio')
                .where('clientIsActive', '1')
                .first();

            // Check if the credentials are found in the database
            if (twilioCredentials) {
                // Set the credentials and initialize Twilio client
                this.accountSid = twilioCredentials.clientAccountId;
                this.authToken = twilioCredentials.clientApiKey;
                this.twilioNumber = "+91" + twilioCredentials.clientWhatsppNumber;
                this.client = twilio(this.accountSid, this.authToken);
                return true;  // Setup success
            } else {
                // Log error if credentials not found
                this.logger.error('Twilio credentials not found in the database', 'twilio/error');
                return false;  // Setup failure
            }
        } catch (error) {
            // Log any setup errors
            this.logger.write("Something went wrong in setup: " + error, "twilio/error");
            return false;  // Setup failure due to error
        }
    }

    /**
     * Creates a new WhatsApp template through Twilio API.
     * @param {string} templateName - Name of the template to create.
     * @param {string} body - Template message body.
     * @param {Array} variables - List of variables to be used in the template.
     * @returns {Promise<Object>} Returns the response from Twilio API upon success.
     */
    async createTemplate(templateName, body, variables) {
        // Ensure Twilio setup is successful before proceeding
        const setupSuccess = await this.#setup();
        if (!setupSuccess) return;

        try {
            // Create a template via Twilio API
            const response = await this.client.content.templates.create({
                name: templateName,
                body: body,
                variables: variables
            });
            this.logger.write("Template created: " + templateName, "twilio/success");  // Log success
            return response;  // Return the created template response
        } catch (error) {
            // Log error in case of failure
            this.logger.write("Error creating template: " + error, "twilio/error");
            throw error;  // Throw error for higher-level handling
        }
    }

    /**
     * Fetches the status of a specific template by its SID.
     * @param {string} templateSid - The SID of the template whose status to fetch.
     * @returns {Promise<Object>} Returns the template status from Twilio API.
     */
    async getTemplateStatus(templateSid) {
        // Ensure Twilio setup is successful before proceeding
        const setupSuccess = await this.#setup();
        if (!setupSuccess) return;

        try {
            // Fetch the template status using Twilio API
            const response = await this.client.content.templates(templateSid).fetch();
            this.logger.write("Fetched template status for SID: " + templateSid, "twilio/success");  // Log success
            return response;  // Return the template status
        } catch (error) {
            // Log error in case of failure
            this.logger.write("Error fetching template status: " + error, "twilio/error");
            throw error;  // Throw error for higher-level handling
        }
    }

    /**
     * Sends a template-based WhatsApp message using Twilio API.
     * @param {string} to - Recipient's WhatsApp number.
     * @param {string} templateSid - The SID of the template to send.
     * @param {Object} templateParams - The variables for the template.
     * @returns {Promise<Object>} Returns the sent message response from Twilio API.
     */
    async sendTemplateMessage(to, templateSid, templateParams) {
        // Ensure Twilio setup is successful before proceeding
        const setupSuccess = await this.#setup();
        if (!setupSuccess) return;

        try {
            // Send a template message using Twilio API
            const message = await this.client.messages.create({
                from: `whatsapp:${this.twilioNumber}`,
                to: `whatsapp:+${to}`,
                contentSid: templateSid,
                contentVariables: JSON.stringify(templateParams),
            });
            this.logger.write(`Template message sent to ${to}`, 'twilio/success');  // Log success
            return message;  // Return the sent message response
        } catch (error) {
            // Log error in case of failure
            this.logger.write(`Error sending template message to ${to}: ${error}`, 'twilio/error');
            throw error;  // Throw error for higher-level handling
        }
    }

    /**
     * Receives an incoming WhatsApp message and logs it into the database.
     * @param {Object} data - Incoming message data from Twilio webhook.
     * @returns {Promise<Object>} Returns the message details (sender and message).
     */
    async receiveMessage(data) {
        // Ensure Twilio setup is successful before proceeding
        const setupSuccess = await this.#setup();
        if (!setupSuccess) return;

        try {
            const message = data.Body;  // Extract message body from incoming data
            const from = data.From;  // Extract sender's number from incoming data

            // Log incoming message
            this.logger.write(`Received WhatsApp message from ${from}: ${message}`, 'twilio/incoming');

            // Insert the message into the database
            await this.db.table(tables.TBL_RECEIVED_MESSAGES)
                .insert({
                    sender: from,
                    message_body: message,
                    received_at: new Date()
                });

            // Log successful insertion into the database
            this.logger.write(`Inserted received message from ${from} into the database`, 'twilio/db-success');
            return { from, message };  // Return message details
        } catch (error) {
            // Log error in case of failure
            this.logger.write("Error receiving and inserting message: " + error, "twilio/error");
            throw error;  // Throw error for higher-level handling
        }
    }

    /**
     * Fetches all WhatsApp message templates from Twilio and inserts them into the database.
     * @returns {Promise<Array>} Returns the list of fetched templates.
     */
    async getAllTemplates() {
        // Ensure Twilio setup is successful before proceeding
        const setupSuccess = await this.#setup();
        if (!setupSuccess) return;

        try {
            // Fetch all templates via Twilio API
            const templates = await this.client.content.templates.list();
            this.logger.write("Fetched all created templates", 'twilio/success');  // Log success

            // Insert each template into the database
            for (const template of templates) {
                await this.db.table(tables.TBL_TEMPLATES)
                    .insert({
                        template_sid: template.sid,
                        template_name: template.name,
                        template_body: template.body,
                        created_at: new Date()
                    });
            }

            this.logger.write("Inserted fetched templates into the database", 'twilio/db-success');  // Log success
            return templates;  // Return the list of fetched templates
        } catch (error) {
            // Log error in case of failure
            this.logger.write("Error fetching and inserting templates: " + error, "twilio/error");
            throw error;  // Throw error for higher-level handling
        }
    }

    /**
     * Sends a freeform WhatsApp message (text and optional media) using Twilio API.
     * @param {string} to - Recipient's WhatsApp number.
     * @param {string} message - The message body to send.
     * @param {string} [mediaUrl] - Optional URL of media to send (image, video, etc.).
     * @returns {Promise<Object>} Returns the message response from Twilio API.
     */
    async sendFreeformMessage(to, message, mediaUrl = null) {
        // Ensure Twilio setup is successful before proceeding
        const setupSuccess = await this.#setup();
        if (!setupSuccess) return;

        try {
            // Prepare message options including media if provided
            const messageOptions = {
                from: `whatsapp:${this.twilioNumber}`,
                to: `whatsapp:+91${to}`,
                body: message,
            };

            // Include media URL if provided
            if (mediaUrl) {
                messageOptions.mediaUrl = [mediaUrl];
            }

            // Send the freeform message via Twilio API
            const response = await this.client.messages.create(messageOptions);
            this.logger.write(`Freeform message sent to ${to}`, 'twilio/success');  // Log success
            return response;  // Return the sent message response
        } catch (error) {
            // Log error in case of failure
            this.logger.write(`Error sending freeform message to ${to}: ${error}`, 'twilio/error');
            throw error;  // Throw error for higher-level handling
        }
    }
}

// Export the Twilio class for use in other modules
module.exports = Twilio;
