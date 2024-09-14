const axios = require('axios');
const Logger = require('../logs/Logger'); // Import the Logger utility for logging errors and messages
const MySQL = require('../db/Mysql'); // MySQL utility for performing database operations
const tables = require('../../config/tables'); // Configuration for database table names

/**
 * @class Event
 * @description Handles the processing of events by sending notifications based on event data. 
 *              This class is responsible for preparing request data, sending HTTP requests, 
 *              and updating event statuses in the database.
 * @version 1.0.0
 * @author Jay Chauhan
 */
class Event {
    /**
     * Creates an instance of the Event class.
     * @param {Object} event - The event object containing details for processing.
     * @param {string} event.eventRequestUrl - The API endpoint URL for sending notifications.
     * @param {string} event.eventRequestType - The HTTP method to use (e.g., 'GET', 'POST').
     * @param {Object} [event.eventRequestHeaders] - Optional headers for the HTTP request.
     * @param {Object} event.eventRequestData - The request data structure containing placeholders.
     * @param {Array<Object>} event.eventData - An array of objects containing event-specific data.
     * @param {string} event.eventId - The unique identifier for the event.
     */
    constructor(event) {
        this.requestUrl = event.eventRequestUrl;
        this.requestType = event.eventRequestType;
        this.requestHeaders = event.eventRequestHeaders || {};
        this.eventRequestData = event.eventRequestData;
        this.eventData = event.eventData;
        this.eventId = event.eventId;
    }

    /**
     * Handles the event by sending notifications and updating the event status in the database.
     * @returns {Promise<void>} - A promise that resolves when the event handling is complete.
     */
    async handleEvent() {
        const db = new MySQL(); // Create a new instance of the MySQL utility for database operations

        try {
            await db.connect(); // Connect to the database

            // Array to store responses from each notification request
            const eventResponse = [];

            // Iterate over each event data item and send notifications
            for (const details of this.eventData) {
                // Prepare request data by replacing placeholders with actual data
                const dataToSend = this.#replacePlaceholders(this.eventRequestData, details);

                // Send the HTTP request
                const response = await axios({
                    method: this.requestType,
                    url: this.requestUrl,
                    headers: {
                        'Content-Type': 'application/json',
                        ...this.requestHeaders,
                    },
                    data: dataToSend,
                });
                eventResponse.push(response.data); // Collect the response
            }

            // Prepare data for updating the event status in the database
            const eventUpdateData = {
                eventStatus: "1", // Update event status to '1' (processed)
                eventResponseCode: 200, // Store the HTTP response status code
                eventResponseBody: JSON.stringify(eventResponse) // Store the HTTP response body as a JSON string
            };
            await db.table(tables.TBL_EVENTS).where("eventId", this.eventId).update(eventUpdateData);
        } catch (error) {
            const logger = new Logger(); // Create an instance of the Logger utility
            logger.write("Error handling event [Event Class]: " + error, "event/error"); // Log the error
        } finally {
            await db.disconnect(); // Ensure the database connection is closed
        }
    }

    /**
     * Replaces placeholders in the request data with values from the event-specific data.
     * @param {Object|string} data - The request data containing placeholders (can be an object or string).
     * @param {Object} recipient - The event-specific data used to replace placeholders.
     * @returns {Object|string} - The updated request data with placeholders replaced.
     */
    #replacePlaceholders(data, recipient) {
        const replaceInString = (str, obj) => {
            return str.replace(/{{(.*?)}}/g, (match, key) => {
                const keys = key.split('.').map(k => k.trim());
                let value = obj;
                for (const k of keys) {
                    if (value && value[k] !== undefined) {
                        value = value[k];
                    } else {
                        return match;
                    }
                }
                return value || match;
            });
        };

        if (typeof data === 'string') {
            return replaceInString(data, recipient);
        }

        if (typeof data === 'object' && !Array.isArray(data)) {
            const result = {};
            for (const [key, value] of Object.entries(data)) {
                result[key] = this.#replacePlaceholders(value, recipient);
            }
            return result;
        }

        if (Array.isArray(data)) {
            return data.map(item => this.#replacePlaceholders(item, recipient));
        }

        return data;
    }
}

module.exports = Event; // Export the Event class for use in other parts of the application
