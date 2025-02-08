require('dotenv').config();  // Loading environment variables from a .env file
const Logger = require('../utils/logs/Logger'); // Import the Logger utility for logging
const HttpRequest = require('../utils/request/HttpRequest');

class DirectoryController {
    static async getDirectoryTree(req, res) {
        try {
            const headers = {
                "Content-Type": "application/json",
                "authorization": "Bearer " + process.env.NAS_AUTH_TOKEN
            };
            const request = new HttpRequest(process.env.NAS_BASE_URL);
            const response = await request.getRequest("/get_data", headers);

            const logger = new Logger();
            logger.write("Error fetching directory: " + JSON.stringify(response), "directory-list/response");
            res.status(200).json({ success: true, directoryTree: response });
        } catch (error) {
            const logger = new Logger();
            logger.write("Error fetching directory: " + JSON.stringify(error), "directory-list/error");
            res.status(500).json({ message: 'Oops! Something went wrong!' });
        }
    }
}

module.exports = DirectoryController; // Export the DirectoryController class