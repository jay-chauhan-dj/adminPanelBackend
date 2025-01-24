// Import axios library to make HTTP requests
const axios = require('axios');
const Logger = require('../logs/Logger');  // Import Logger class for logging

/**
 * HttpRequest class to handle HTTP requests using axios.
 * Provides methods for GET, POST, PUT, and DELETE requests.
 */
class HttpRequest {
    /**
     * Constructor to initialize the HttpRequest with a base URL and default headers.
     * @param {string} baseURL - The base URL for all HTTP requests.
     */
    constructor(baseURL) {
        // Create an axios instance with the base URL and default headers
        this.client = axios.create({
            baseURL: baseURL,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    /**
     * Sends a GET request to the specified endpoint.
     * @param {string} endpoint - The endpoint to send the GET request to.
     * @param {object} [headers={}] - Optional headers for the request.
     * @returns {Promise<any>} - The response data.
     */
    async getRequest(endpoint, headers = {}) {
        try {
            // Send GET request and return response data
            const response = await this.client.get(endpoint, { headers });
            return response.data;
        } catch (error) {
            // Handle and log errors
            this.handleError(error);
        }
    }

    /**
     * Sends a POST request to the specified endpoint with the provided data.
     * @param {string} endpoint - The endpoint to send the POST request to.
     * @param {object} data - The data to send in the POST request.
     * @param {object} [headers={}] - Optional headers for the request.
     * @returns {Promise<any>} - The response data.
     */
    async postRequest(endpoint, data, headers = {}) {
        try {
            // Send POST request and return response data
            const response = await this.client.post(endpoint, data, { headers });
            return response.data;
        } catch (error) {
            // Handle and log errors
            this.handleError(error);
        }
    }

    /**
     * Sends a PUT request to the specified endpoint with the provided data.
     * @param {string} endpoint - The endpoint to send the PUT request to.
     * @param {object} data - The data to send in the PUT request.
     * @param {object} [headers={}] - Optional headers for the request.
     * @returns {Promise<any>} - The response data.
     */
    async putRequest(endpoint, data, headers = {}) {
        try {
            // Send PUT request and return response data
            const response = await this.client.put(endpoint, data, { headers });
            return response.data;
        } catch (error) {
            // Handle and log errors
            this.handleError(error);
        }
    }

    /**
     * Sends a DELETE request to the specified endpoint.
     * @param {string} endpoint - The endpoint to send the DELETE request to.
     * @param {object} [headers={}] - Optional headers for the request.
     * @returns {Promise<any>} - The response data.
     */
    async deleteRequest(endpoint, headers = {}) {
        try {
            // Send DELETE request and return response data
            const response = await this.client.delete(endpoint, { headers });
            return response.data;
        } catch (error) {
            // Handle and log errors
            this.handleError(error);
        }
    }

    /**
     * Handles and logs errors from HTTP requests.
     * @param {Error} error - The error object to handle.
     * @throws {Error} - The thrown error after logging.
     */
    handleError(error) {
        const logger = new Logger();
        if (error.response) {
            // Log error response data if available
            logger.write('Error response: ' + error.response.data, "request/error");
        } else if (error.request) {
            // Log error request if no response was received
            logger.write('Error request:' + error.request, "request/error");
        } else {
            // Log general error message
            logger.write('General error:' + error.message, "request/error");
        }
    }
}

// Export HttpRequest class for use in other modules
module.exports = HttpRequest;
