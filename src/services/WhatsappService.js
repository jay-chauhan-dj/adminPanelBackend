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
            const response = await this.twilio.sendFreeformMessage(to, this.#convertToWhatsappFormate(body));

            // Prepare message details for database insertion
            const messageDetails = {
                whatsappMessageId: response.sid,  // Unique message ID from Twilio
                contactNumber: response.to.split(':')[1].replace('+91'),  // Extract recipient number from Twilio response
                messageBody: this.#convertToWhatsappFormate(response.body),  // Message content
                messageType: "0",  // Message type (0 indicates sent message)
            };

            // Connect to the database, insert message details, then disconnect
            await this.db.connect();
            await this.db.table(tables.TBL_WHATSAPP_MESSAGES).insert(messageDetails);
            await this.db.disconnect();

            // Log successful message sending
            this.logger.write(`WhatsApp message sent to ${to}: ${body}`, 'whatsapp/message');
        } catch (error) {
            // Log error if message sending fails
            this.logger.write(`Failed to send WhatsApp message to ${to}: ${error}`, 'whatsapp/error');
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
                if (!templateParams || templateParams.length == templateData.paramCount) {
                    let templateVariables = {};
                    let i = 1;
                    // Populate template variables based on the parameter count
                    if (templateParams) {
                        templateParams.forEach(element => {
                            templateVariables[i] = element;
                            i++;
                        });
                    }

                    // Send the template message using Twilio API
                    const response = await this.twilio.sendTemplateMessage(to, templateData.templateSid, templateVariables);
                    this.logger.write(JSON.stringify(response), 'whatsapp/sent');  // Log the response

                    // Prepare message details for database insertion
                    const messageDetails = {
                        whatsappMessageId: response.sid,  // Unique message ID from Twilio
                        contactNumber: response.to.split(':')[1].replace('+91'),  // Extract recipient number
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
            const templateData = await this.db.table(tables.TBL_WHATSAPP_TEMPLATES)
                .select("templateId")
                .where("templateName", name)
                .where("templateIsActive", "1")
                .first();
            await this.db.disconnect();

            return templateData.templateId;  // Return the fetched template ID
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
                    contactNumber: data.From.split(':')[1].replace('+91'),  // Extract and clean up sender's phone number (removes 'whatsapp:')
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

    /**
    * @static
    * @method getWhstappMessages
    * @description Fetches Whstapp data from the database and sends it as a JSON response.
    */
    async getWhatsappMessages() {
        try {
            await this.db.connect(); // Connect to the database
            const whatsappMessages = await this.db.table(tables.TBL_WHATSAPP_MESSAGES + ' m')
                .join(tables.TBL_CONTACT_INFORMATIONS + ' ci', "ci.contactInformationValue=m.contactNumber", 'LEFT')
                .join(tables.TBL_CONTACTS + ' c', "c.contactId=ci.contactId", 'LEFT')
                .orderBy('m.contactNumber', 'ASC')
                .select("m.*", "CONCAT(c.contactFirstName, ' ', c.contactLastName) as name", "c.contactImage as image").get(); // Fetch whatsapp messages from the specified table
            await this.db.disconnect(); // Disconnect from the database
            const userMessage = this.#generateWhatsappJson(whatsappMessages); // Generate JSON object from the whatsapp messages

            return userMessage; // Return whatsapp messages data
        } catch (error) {
            const logger = new Logger(); // Create a new instance of the Logger utility
            logger.write("Error in getting whatsapp: " + error, "whatsapp/error"); // Log the error
            return false;
        }
    }

    /**
     * @static
     * @private
     * @method #generateSmsJson
     * @description Generates a structured JSON object from the whatsapp messages.
     * @param {Array} data - Array of whatsapp messages objects
     * @returns {Array} - Array of user message objects
     */
    #generateWhatsappJson(data) {
        const users = {}; // Initialize an empty object to store user messages

        data.forEach(item => {
            const { contactNumber, messageBody, messageTime, messageType, name, image } = item; // Destructure the whatsapp messages item
            const dateKey = this.#formatDate(messageTime); // Format the date

            // Process sender information
            if (!users[contactNumber]) {
                users[contactNumber] = {
                    userId: contactNumber,
                    name: name || contactNumber,
                    path: image || '/assets/images/auth/user.png',
                    time: this.#formatTime(messageTime),
                    preview: this.#convertToHTML(this.#generatePreview(messageBody)),
                    messages: {},
                    active: true
                };
            }

            // Initialize dateKey if not present for the sender
            if (!users[contactNumber].messages[dateKey]) {
                users[contactNumber].messages[dateKey] = [];
            }

            // Add message to the sender's messages
            users[contactNumber].messages[dateKey].push({
                fromUserId: ((!(messageType == 0)) ? (contactNumber) : ('919313440532')),
                toUserId: ((!(messageType == 0)) ? ('919313440532') : (contactNumber)),
                text: this.#convertToHTML(messageBody),
                time: this.#formatTime(messageTime)
            });
        });

        return Object.values(users); // Return the array of user message objects
    }

    /**
     * @static
     * @private
     * @method #formatDate
     * @description Formats a Date object into a string (DD-MMM-YYYY).
     * @param {Date} date - Date object
     * @returns {String} - Formatted date string
     */
    #formatDate(date) {
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short'
        });
    }

    /**
     * @static
     * @private
     * @method #formatTime
     * @description Formats a Date object into a string (DD-MMM-YYYY, HH:MM AM/PM).
     * @param {Date} date - Date object
     * @returns {String} - Formatted time string
     */
    #formatTime(date) {
        return date.toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    /**
     * @static
     * @private
     * @method #generatePreview
     * @description Generates a preview text from the message body.
     * @param {String} message - message body
     * @returns {String} - Preview text
     */
    #generatePreview(message) {
        const lines = message.split('\n').filter(line => line.trim() !== ''); // Split the message into lines and filter out empty lines
        return lines.slice(0, 2).join('\n') + (lines.length > 2 ? '...' : ''); // Join the first two lines and add '...' if there are more lines
    }

    #convertToHTML(text) {
        // Replace *text* with <strong>text</strong>
        // The regex /\*(.*?)\*/ finds text between single * symbols
        // and replaces it with <strong> tags around the content.
        const strongReplaced = text.replace(/\*(.*?)\*/g, '<strong>$1</strong>');

        // Replace _text_ with <em>text</em>
        // The regex /_(.*?)_/ finds text between single _ symbols
        // and replaces it with <em> tags around the content.
        const italicReplaced = strongReplaced.replace(/_(.*?)_/g, '<em>$1</em>');

        // Replace new line characters \n with <br> HTML tags
        // This handles line breaks by converting them into HTML <br> tags.
        const newLineReplaced = italicReplaced.replace(/\n/g, '<br>');

        // Return the fully processed HTML string
        return newLineReplaced;
    }

    #convertToWhatsappFormate(htmlText) {
        // Replace <strong>text</strong> with *text*
        // This regex finds content between <strong> tags and replaces it with *text*.
        const strongReversed = htmlText.replace(/<strong>(.*?)<\/strong>/g, '*$1*');

        // Replace <em>text</em> with _text_
        // This regex finds content between <em> tags and replaces it with _text_.
        const italicReversed = strongReversed.replace(/<em>(.*?)<\/em>/g, '_$1_');

        // Replace <br> with a newline character \n
        // This handles the <br> HTML tag and converts it back to a newline.
        const newLineReversed = italicReversed.replace(/<br>/g, '\n');

        // Return the plain text string
        return newLineReversed;
    }
}

// Export the WhatsappService class for use in other modules
module.exports = WhatsappService;
