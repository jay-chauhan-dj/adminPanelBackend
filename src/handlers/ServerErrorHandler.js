const Logger = require("../utils/logs/Logger");

function generalErrorHandler(err, req, res, next) {
    const logger = new Logger();
    logger.write(`Invalid JSON payload: ${JSON.stringify(err)}`, "json/error");
    res.status(err.status || 500).json({ message: 'Internal Server Error' });
}

module.exports = generalErrorHandler;
