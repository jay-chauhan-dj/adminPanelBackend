const MySQL = require('../utils/db/Mysql'); // Import the MySQL utility for database operations
const tables = require('../config/tables'); // Import table configurations
const Logger = require('../utils/logs/Logger'); // Import the Logger utility for logging
const TwoFactorAuthService = require('../services/2fa/TwoFactorAuthService');

class VerifyUserController {
    static async createSecret(req, res) {
        try {
            const token = req.headers.authorization.replace("Bearer ", "");
            const mfaService = new TwoFactorAuthService(token);
            const qrUrl = await mfaService.generateSecret();

            res.status(200).json({ success: true, qrUrl: qrUrl });
        } catch (error) {
            const logger = new Logger();

            logger.write("Error creating secret [controller]: " + JSON.stringify(error), "verifyuser/error");
            res.status(500).json({ message: 'Oops! Something went wrong!' });
        }
    }

    static async verifySecret(req, res) {
        try {
            const token = req.headers.authorization.replace("Bearer ", "");
            const reqData = req.body;
            const mfaService = new TwoFactorAuthService(token);
            const verify = await mfaService.verifyCode(reqData.code);

            res.status(200).json({ success: true, message: "Verified User!", verify: verify });
        } catch (error) {
            const logger = new Logger();
            logger.write("Error verifying user [controller]: " + JSON.stringify(error), "verifyuser/error");
            res.status(500).json({ message: 'Oops! Something went wrong!' });
        }
    }
}

module.exports = VerifyUserController; // Export the RoutesController class
