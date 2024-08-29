require('dotenv').config();
const { getUserByToken } = require('../utils/functions');
const Logger = require('../utils/logs/Logger'); // Import the Logger utility for logging

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const user = await getUserByToken(token);

        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        req.user = user;
        next();
    } catch (error) {
        const logger = new Logger(); // Create a new instance of the Logger utility
        logger.write("Middleware Error: " + error, "middleware/error"); // Log the smsent
        res.status(500).json({ message: 'Opps! Something went wrong' });
    }
};

module.exports = authMiddleware;
