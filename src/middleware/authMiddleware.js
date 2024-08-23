require('dotenv').config();
const { getUserByToken } = require('../utils/functions');

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
        console.error('Error in authMiddleware:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = authMiddleware;
