const Logger = require('../logs/Logger');  // Import Logger class for logging
const MySQL = require('../db/Mysql');  // Import MySQL class for database operations
const HttpRequest = require('../request/HttpRequest'); // Import HttpRequest class for HTTP requests
const tables = require('../../config/tables');  // Import table configurations
const { base64Encode } = require('../functions'); // Import base64Encode function

/**
 * Whatsapp class to handle WhatsApp API interactions.
 * Provides methods to send template messages using stored client credentials.
 */
class Whatsapp {
    /**
     * Constructor to initialize instances of Logger, MySQL, and HttpRequest classes.
     */
    constructor() {
        this.logger = new Logger();  // Instance of Logger class for logging
        this.db = new MySQL();  // Instance of MySQL class for database operations
        this.request = new HttpRequest();  // Instance of HttpRequest class for HTTP requests
        this.baseUrl = ""; // API Base URL
        this.headers = {}; // Object to store request headers
    }

    /**
     * Private method to set up the client by fetching client information from the database.
     * @param {number} clientId - The client ID to fetch details for.
     * @returns {Promise<string>} - The client's API key.
     */
    async #setup(clientId) {
        // Connect to the database
        await this.db.connect();

        // Fetch client details from the database
        const client = await this.db.table(tables.TBL_WHATSAPP_CLIENTS)
            .select("clientBaseUrl", "clientAccountId", "clientApiKey")
            .where("clientId", clientId)
            .first();

        // Disconnect from the database
        await this.db.disconnect();

        // Set the headers with base64 encoded authorization
        this.headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + base64Encode(client.clientAccountId + ":" + client.clientApiKey),
        };

        // Set the base URL for the API
        this.baseUrl = client.clientBaseUrl;

        // Return the client's API key
        return client.clientApiKey;
    }

    /**
     * Sends a template message to a WhatsApp number.
     * @param {number} clientId - The client ID for which to send the message.
     * @param {string} templateName - The name of the template to use.
     * @param {string} whatsappNumber - The WhatsApp number to send the message to.
     * @param {string} name - The name of the recipient.
     * @param {object} templateData - The data to include in the template.
     * @returns {Promise<object>} - The response from the API.
     */
    async sendTemplateMessage(clientId, templateName, whatsappNumber, name, templateData) {
        // Prepare the data to be posted to the API
        const postData = {
            apiKey: await this.#setup(clientId),  // Fetch the API key and setup client
            campaignName: templateName,  // Set the campaign name
            destination: whatsappNumber,  // Set the destination WhatsApp number
            userName: name,  // Set the recipient's name
            templateParams: templateData  // Set the template parameters
        }

        // Construct the full API endpoint URL
        const url = this.baseUrl + "/campaign/t1/api/v2";

        // Send the POST request to the API
        const response = await this.request.postRequest(url, postData, this.headers);

        // Return the API response
        return response;
    }
}

// Export Whatsapp class for use in other modules
module.exports = Whatsapp;
