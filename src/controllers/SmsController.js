const Logger = require('../utils/logs/Logger'); // Import the Logger utility for logging
const MySQL = require('../utils/db/Mysql'); // Import the MySQL utility for database operations
const tables = require('../config/tables'); // Import table configurations

/**
 * @class SmsController
 * @description Controller class for handling SMS-related operations such as fetching SMS data from the database.
 *              This class contains static methods that interact with the database and handle HTTP requests and responses.
 * @version 1.0.0
 * @date 2024-07-30
 * @Author Jay Chauhan
 */
class SmsController {

    /**
     * @static
     * @method getSms
     * @description Fetches SMS data from the database and sends it as a JSON response.
     * @param {Object} req - HTTP request object
     * @param {Object} res - HTTP response object
     */
    static async getSms(req, res) {
        const db = new MySQL(); // Create a new instance of the MySQL utility

        try {
            await db.connect(); // Connect to the database
            const smsData = await db.table(tables.TBL_SMS).select("*").get(); // Fetch SMS data from the specified table
            const userMessage = SmsController.#generateSmsJson(smsData); // Generate JSON object from the SMS data

            res.status(200).json(userMessage); // Send the SMS data as a JSON response
        } catch (error) {
            const logger = new Logger(); // Create a new instance of the Logger utility
            logger.write("Error in getting sms: " + error, "sms/error"); // Log the error
            res.status(500).json({ message: 'Oops! Something went wrong!' }); // Send an error response
        } finally {
            await db.disconnect(); // Disconnect from the database
        }
    }

    static async receiveSms(req, res) {
        const logger = new Logger(); // Create a new instance of the Logger utility
        logger.write("Getting sms: " + JSON.stringify(req.body), "sms/receive"); // Log the smsent
        res.status(200).json({ message: 'Sms imported successfully!' }); // Send an response
    }

    /**
     * @static
     * @private
     * @method #generateSmsJson
     * @description Generates a structured JSON object from the SMS data.
     * @param {Array} data - Array of SMS data objects
     * @returns {Array} - Array of user message objects
     */
    static #generateSmsJson(data) {
        const users = {}; // Initialize an empty object to store user messages

        data.forEach(item => {
            const { smsFrom, smsTo, smsBody, smsTime } = item; // Destructure the SMS data item
            const dateKey = SmsController.#formatDate(smsTime); // Format the date

            // Process sender information
            if (!users[smsFrom]) {
                users[smsFrom] = {
                    userId: smsFrom,
                    name: smsFrom,
                    path: '/assets/images/auth/user.png',
                    time: SmsController.#formatTime(smsTime),
                    preview: SmsController.#generatePreview(smsBody),
                    messages: {},
                    active: true
                };
            }

            // Initialize dateKey if not present for the sender
            if (!users[smsFrom].messages[dateKey]) {
                users[smsFrom].messages[dateKey] = [];
            }

            // Add message to the sender's messages
            users[smsFrom].messages[dateKey].push({
                fromUserId: smsFrom,
                toUserId: smsTo,
                text: smsBody,
                time: SmsController.#formatTime(smsTime)
            });

            // Process receiver information
            if (!users[smsTo]) {
                users[smsTo] = {
                    userId: smsTo,
                    name: smsTo,
                    path: '/assets/images/auth/user.png',
                    time: SmsController.#formatTime(smsTime),
                    preview: SmsController.#generatePreview(smsBody),
                    messages: {},
                    active: true
                };
            }

            // Initialize dateKey if not present for the receiver
            if (!users[smsTo].messages[dateKey]) {
                users[smsTo].messages[dateKey] = [];
            }

            // Add message to the receiver's messages
            users[smsTo].messages[dateKey].push({
                fromUserId: smsFrom,
                toUserId: smsTo,
                text: smsBody,
                time: SmsController.#formatTime(smsTime)
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
    static #formatDate(date) {
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
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
    static #formatTime(date) {
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
     * @description Generates a preview text from the SMS body.
     * @param {String} message - SMS body
     * @returns {String} - Preview text
     */
    static #generatePreview(message) {
        const lines = message.split('\n').filter(line => line.trim() !== ''); // Split the message into lines and filter out empty lines
        return lines.slice(0, 2).join('\n') + (lines.length > 2 ? '...' : ''); // Join the first two lines and add '...' if there are more lines
    }
}

module.exports = SmsController; // Export the SmsController class
