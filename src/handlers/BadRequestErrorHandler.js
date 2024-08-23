const Logger = require("../utils/logs/Logger");

function jsonErrorHandler(err, req, res, next) {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        const logger = new Logger();
        logger.write(`Invalid JSON payload: ${err.body}\nRequest Body: ${JSON.stringify(req.body)}`, "json/error");
        return res.status(400).json({ message: 'Invalid JSON payload' });
    }
    next();
}

module.exports = jsonErrorHandler;
