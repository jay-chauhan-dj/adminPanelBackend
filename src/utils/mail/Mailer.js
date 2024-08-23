const nodemailer = require('nodemailer');
const imaps = require('imap-simple');
require('dotenv').config();

/**
 * @class Email
 * @description A class to handle sending, receiving, and replying to emails using SMTP and IMAP.
 * @author Jay Chauhan
 */
class Email {
    /**
     * @constructor
     * Initializes the Email class with SMTP and IMAP configurations.
     */
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST,
            port: process.env.MAIL_PORT,
            secure: process.env.MAIL_SECURE,
            auth: {
                user: process.env.MAIL_USERNAME,
                pass: process.env.MAIL_PASSWORD,
            },
        });

        this.imapConfig = {
            imap: {
                user: process.env.IMAP_USER,
                password: process.env.IMAP_PASS,
                host: process.env.IMAP_HOST,
                port: process.env.IMAP_PORT,
                tls: true,
                authTimeout: 3000
            }
        };
    }

    /**
     * @function sendMail
     * @description Sends an email using SMTP.
     * @param {Object} mailOptions - The mail options including from, to, subject, text, and html.
     * @returns {Promise<void>}
     */
    async sendMail(mailOptions) {
        try {
            const mailDetails = {
                from: mailOptions.from || '"' + process.env.MAIL_FROM_NAME + '" <' + process.env.MAIL_FROM_ADDRESS + '>',
                to: mailOptions.to,
                subject: mailOptions.subject,
                text: mailOptions.text,
                html: mailOptions.html,
            }
            let info = await this.transporter.sendMail(mailDetails);
            return {
                status: "success",
                message: "Email sent successfully",
                info: info
            };
        } catch (error) {
            return {
                status: "error",
                error: error
            }
        }
    }

    /**
     * @function receiveMail
     * @description Receives emails from the inbox using IMAP.
     * @returns {Promise<Array>}
     */
    async receiveMail() {
        try {
            const connection = await imaps.connect(this.imapConfig);
            await connection.openBox('INBOX');
            const searchCriteria = ['UNSEEN'];
            const fetchOptions = { bodies: ['HEADER', 'TEXT'], markSeen: false };
            const messages = await connection.search(searchCriteria, fetchOptions);
            await connection.end();
            return messages;
        } catch (error) {
            console.error('Error receiving email:', error);
            return [];
        }
    }

    /**
     * @function replyMail
     * @description Replies to an email.
     * @param {Object} originalMessage - The original message to reply to.
     * @param {string} replyText - The reply text.
     * @returns {Promise<void>}
     */
    async replyMail(originalMessage, replyText) {
        try {
            const replyOptions = {
                from: process.env.MAIL_USER,
                to: originalMessage.from.text,
                subject: `Re: ${originalMessage.subject}`,
                text: replyText,
                inReplyTo: originalMessage.messageId,
                references: [originalMessage.messageId],
            };
            await this.sendMail(replyOptions);
        } catch (error) {
            console.error('Error replying to email:', error);
        }
    }
}

module.exports = Email;