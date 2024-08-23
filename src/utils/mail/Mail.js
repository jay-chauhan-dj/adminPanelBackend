const Email = require('./Mailer');  // Import Email class for sending emails
const Logger = require('../logs/Logger');  // Import Logger class for logging
const MySQL = require('../db/Mysql');  // Import MySQL class for database operations
const tables = require('../../config/tables');  // Import table configurations
require('dotenv').config();  // Load environment variables

/**
 * @class Mail
 * @description A class to provide service for sending, receiving, and replying to emails using Email Class.
 * @author Jay Chauhan
 */
class Mail {
    /**
     * @constructor
     * Initializes the Email class with SMTP and IMAP configurations.
     */
    constructor() {
        this.emailProvider = new Email();  // Instance of Email class for sending emails
        this.logger = new Logger();  // Instance of Logger class for logging
        this.db = new MySQL();  // Instance of MySQL class for database operations
    }

    /**
     * @function send
     * @description Sends an email with the provided details.
     * @param {string} from - The sender's email address.
     * @param {string} to - The recipient's email address.
     * @param {string} subject - The subject of the email.
     * @param {string} content - The HTML content of the email.
     * @returns {Promise<boolean>} - Returns true if the email was sent successfully, otherwise false.
     */
    async send(from, to, subject, content) {
        const mailDetails = {
            from: from,
            to: to,
            subject: subject,
            html: content,
        }
        const mailResponse = await this.emailProvider.sendMail(mailDetails);  // Send email

        // Log the email response based on the status
        if (mailResponse.status == "success") {
            this.logger.write(mailResponse, "email/success");  // Log success response
            const sentEmailDetails = {
                mailMessageId: mailResponse.info.messageId,
                mailFromEmail: mailDetails.from || process.env.MAIL_FROM_ADDRESS,
                mailToEmail: mailDetails.to,
                mailBody: mailDetails.html,
                mailSubject: mailDetails.subject,
                mailType: "1"
            };
            await this.db.connect();  // Connect to the database
            await this.db.table(tables.TBL_MAILS).insert(sentEmailDetails);  // Insert the email details
            this.db.disconnect();  // Disconnect from the database
            return true;
        } else {
            this.logger.write(mailResponse, "email/error");  // Log error response
            return false;
        }
    }

    /**
     * @function sendEmailTemplate
     * @description Sends an email using a template with dynamic data.
     * @param {string} templateId - The ID of the email template.
     * @param {Object} templateData - The data to be replaced in the template.
     * @param {string} to - The recipient's email address.
     * @param {string} [from=null] - The sender's email address. Defaults to the value in the environment variables.
     * @returns {Promise<boolean>} - Returns true if the email was sent successfully, otherwise false.
     */
    async sendEmailTemplate(templateId, templateData, to, from = null) {
        const template = await this.getTemplate(templateId);  // Retrieve the template
        if (!template) {
            this.logger.write(`Failed to send email template: Template not found for ID ${templateId}`, "email/templateError");  // Log error if template not found
            return false;
        }
        const content = this.renderTemplate(template, templateData);  // Render the template with data
        return await this.send(from || process.env.MAIL_USER, to, templateData.subject || template.templateSubject, content);  // Send the email
    }

    /**
     * @function getTemplate
     * @description Retrieves the email template from the database.
     * @param {string} templateId - The ID of the email template.
     * @returns {Promise<Object>} - The email template object.
     */
    async getTemplate(templateId) {
        await this.db.connect();  // Connect to the database
        const template = await this.db.table(tables.TBL_EMAIL_TEMPLATES)
            .select("templateSubject", "templateBody")
            .where("templateId", templateId)
            .where("templateIsActive", "1")
            .first();  // Retrieve the first active template matching the ID
        this.db.disconnect();  // Disconnect from the database
        return template;  // Return the template object
    }

    /**
     * @function renderTemplate
     * @description Replaces placeholders in the template with dynamic data.
     * @param {Object} template - The email template object.
     * @param {Object} templateData - The data to be replaced in the template.
     * @returns {string} - The rendered email content.
     */
    renderTemplate(template, templateData) {
        return template.templateBody.replace(/\{\{\s*mailBodyData\.([a-zA-Z0-9_]+)\s*\}\}/g, (match, p1) => {
            return templateData[p1] !== undefined ? templateData[p1] : match;  // Replace placeholders with data
        });
    }
}

module.exports = Mail;  // Export the Mail class
