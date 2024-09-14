// WhatsAppAutomation.js
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const Logger = require('../logs/Logger');  // Import Logger class for logging

class WhatsAppClient {
    constructor() {
        this.client = new Client({
            authStrategy: new LocalAuth(),
            puppeteer: { headless: true }
        });
        this.logger = new Logger();  // Instance of Logger class for logging
        this.initializeClient();
    }

    // Method to initialize the WhatsApp client and handle QR code
    initializeClient() {
        this.client.on('qr', (qr) => {
            this.logger.write('QR CODE RECEIVED, scan please:', 'whatsapp/whatsapp-client');
            qrcode.generate(qr, { small: true });
        });

        this.client.on('authenticated', () => {
            this.logger.write('AUTHENTICATED', 'whatsapp/whatsapp-client');
        });

        this.client.on('ready', () => {
            this.logger.write('Client is ready!', 'whatsapp/whatsapp-client');
        });

        this.client.on('auth_failure', (message) => {
            this.logger.write('AUTHENTICATION FAILURE ' + message, 'whatsapp/whatsapp-client-error');
        });

        this.client.on('disconnected', (reason) => {
            this.logger.write('Client was logged out', reason, 'whatsapp/whatsapp-client');
        });

        this.client.initialize();
    }

    // Method to send a plain text message
    async sendMessage(phoneNumber, message) {
        const chatId = `${phoneNumber}@c.us`;
        try {
            const response = await this.client.sendMessage(chatId, message);
            this.logger.write('Message sent successfully:', response, 'whatsapp/whatsapp-client');
        } catch (error) {
            this.logger.write('Failed to send message: ' + error, 'whatsapp/whatsapp-client-error');
        }
    }

    // Method to send a message
    async sendFormattedMessage(phoneNumber, message) {
        const chatId = `${phoneNumber}@c.us`;
        try {
            const response = await this.client.sendMessage(chatId, message);
            this.logger.write('Message sent successfully:', response, 'whatsapp/whatsapp-client');
        } catch (error) {
            this.logger.write('Failed to send formatted message: ' + error, 'whatsapp/whatsapp-client-error');
        }
    }

    // Method to send a message with media
    async sendMediaMessage(phoneNumber, mediaPath, message) {
        const chatId = `${phoneNumber}@c.us`;
        try {
            const media = MessageMedia.fromFilePath(mediaPath);
            const response = await this.client.sendMessage(chatId, media, { caption: message });
            this.logger.write('Media message sent successfully:', response, 'whatsapp/whatsapp-client');
        } catch (error) {
            this.logger.write('Failed to send media message: ' + error, 'whatsapp/whatsapp-client-error');
        }
    }

    // Method to listen for incoming messages and respond
    listenForMessages(autoReply = {}) {
        this.client.on('message', (message) => {
            this.logger.write(`Received message from ${message.from}: ${message.body}`, 'whatsapp/whatsapp-client');
            const replyMessage = autoReply[message.body.toLowerCase()];
            if (replyMessage) {
                message.reply(replyMessage);
            }
        });
    }
}

module.exports = WhatsAppClient;
