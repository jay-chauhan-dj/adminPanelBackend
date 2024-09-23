const Twilio = require('../providers/twilio/class-twilio');  // Import Logger class for logging
const Logger = require('../utils/logs/Logger');  // Import Logger class for logging
const MySQL = require('../utils/db/Mysql');  // Import Mysql class for database operations
const tables = require('../config/tables');  // Import tables configuration

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

    async sendMessage(to, body) {
        try {
            const response = await this.twilio.sendFreeformMessage(to, body);
            const messageDetails = {
                whatsappMessageId: response.sid,
                messageFrom: response.from.split(':')[1],
                messageTo: response.to.split(':')[1],
                messageBody: response.body,
                messageType: "0",
            };
            await this.db.connect();
            await this.db.table(tables.TBL_WHATSAPP_MESSAGES).insert(messageDetails);
            await this.db.disconnect();
            this.logger.info(`WhatsApp message sent to ${to}: ${body}`, 'whatsapp/message');
        } catch (error) {
            this.logger.error(`Failed to send WhatsApp message to ${to}: ${error}`, 'whatsapp/error');
        }
    }

    async sendtemplateMessage(to, templateId, templateParams) {
        try {
            await this.db.connect();
            const templateData = await this.db.table(tables.TBL_WHATSAPP_TEMPLATES).select('templateWhatsappClientIdentifier as templateSid', 'templateVariableCount as paramCount').where('templateId', templateId).where('templateIsActive', '1').first();
            await this.db.disconnect();

            if (templateData) {
                if (templateParams.length == templateData.templateParams) {
                    let templateVariables = {};
                    let i = 1;
                    templateParams.forEach(element => {
                        templateVariables[i] = element;
                        i++;
                    });
                    const response = await this.twilio.sendTemplateMessage(to, templateData.templateSid, templateVariables);
                    const messageDetails = {
                        whatsappMessageId: response.sid,
                        messageFrom: response.from.split(':')[1],
                        messageTo: response.to.split(':')[1],
                        messageBody: response.body,
                        messageType: "0",
                    };
                    await this.db.connect();
                    await this.db.table(tables.TBL_WHATSAPP_MESSAGES).insert(messageDetails);
                    await this.db.disconnect();
                    return true;
                } else {
                    this.logger.write(`Failed to send WhatsApp message to ${to}: ${error}\nvariable count mismatch!`, 'whatsapp/error');
                    return false;
                }
            } else {
                this.logger.logger.write(`Template not found for ID: ${templateId}`, 'whatsapp/error');
                return false;
            }
        } catch (error) {
            this.logger.write(`Failed to send WhatsApp message to ${to}: ${error}`, 'whatsapp/error');
        }
    }
}

// Export Twilio class for use in other modules
module.exports = WhatsappService;
