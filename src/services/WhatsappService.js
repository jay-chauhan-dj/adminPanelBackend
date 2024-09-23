const Twilio = require('../providers/twilio/class-twilio');  // Import Logger class for logging
const Logger = require('../../utils/logs/Logger');  // Import Logger class for logging
const MySQL = require('../../utils/db/Mysql');  // Import Mysql class for database operations
const tables = require('../../config/tables');  // Import tables configuration

/**
 * WhatsappService class handles all WhatsApp operations through Twilio API
 * @class
 */
class WhatsappService {
    constructor() {
        this.logger = new Logger();  // Logger instance for logging
        this.db = new MySQL();  // MySQL instance for database operations
        this.twilio = new Twilio();  // Twilio instance
    }

    async sendMessage() {
        try {
            await this.twilio.sendFreeformMessage('919664788574', '*Hello There!*\n\nThis is "Jay Chauhan".\n\nI will schedule a call with you today by 6 pm.');
            this.logger.info(`WhatsApp message sent to ${to}: ${body}`, 'whatsapp/message');
        } catch (error) {
            this.logger.error(`Failed to send WhatsApp message to ${to}: ${error}`, 'whatsapp/error');
        }
    }
}

// Export Twilio class for use in other modules
module.exports = WhatsappService;
