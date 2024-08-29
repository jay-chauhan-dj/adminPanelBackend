const Logger = require('../utils/logs/Logger'); // Import the Logger utility for logging

// Error handling middleware
const errorMiddleware = (err, req, res, next) => {
    // Log the detailed error information to the console
    const logger = new Logger(); // Create a new instance of the Logger utility
        logger.write("Middleware Error: " + error, "project/error"); // Log the smsent
        res.status(500).json({ message: 'Opps! Something went wrong' });
};

module.exports = errorMiddleware;
