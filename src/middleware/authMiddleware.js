/**
 * Author: Jay Chauhan
 * Middleware Name: Authentication Middleware
 * Description:
 * This middleware validates the authorization token from the request headers.
 * If the token is valid, it attaches the user object to the request object (`req.user`) 
 * and proceeds to the next middleware or route handler. If the token is invalid, 
 * it sends an appropriate error response.
 */

require('dotenv').config(); // Load environment variables from the .env file.

const { getUserByToken } = require('../utils/functions'); // Import a utility function to validate and get a user by token.
const Logger = require('../utils/logs/Logger'); // Import a custom Logger utility for logging error messages.

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization; // Get the authorization header from the request.

    // Check if the authorization header exists and starts with 'Bearer '.
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' }); // Send a 401 Unauthorized response if invalid.
    }

    const token = authHeader.replace("Bearer ", ""); // Extract the token by removing 'Bearer ' from the header.

    try {
        const user = await getUserByToken(token); // Validate the token and fetch the corresponding user.

        // If the token is invalid or user is not found, send a 401 Unauthorized response.
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        req.user = user; // Attach the user object to the request for downstream use.
        next(); // Proceed to the next middleware or route handler.
    } catch (error) {
        const logger = new Logger(); // Create an instance of the Logger utility for error logging.
        logger.write("Middleware Error: " + error, "middleware/error"); // Log the error message in the appropriate log file.
        res.status(500).json({ message: 'Opps! Something went wrong' }); // Send a 500 Internal Server Error response.
    }
};

module.exports = authMiddleware; // Export the middleware for use in other parts of the application.
