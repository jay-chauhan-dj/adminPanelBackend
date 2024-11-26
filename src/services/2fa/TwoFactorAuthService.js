/**
 * Author: Jay Chauhan
 * Service Name: Two-Factor Authentication Service
 * Description:
 * This service provides two-factor authentication (2FA) functionality 
 * using Google Authenticator. It includes methods for generating a 
 * 2FA secret, verifying a 2FA code, and fetching user details from the database.
 */

const tables = require('../../config/tables');
const GoogleAuthenticator = require('../../providers/2fa/google-authenticator'); // Import Google Authenticator provider.
const MySQL = require('../../utils/db/Mysql'); // Import MySQL utility for database interactions.
const Logger = require('../../utils/logs/Logger'); // Import Logger utility for logging errors and information.
require('dotenv').config(); // Load environment variables from the .env file.

class TwoFactorAuthService {
    constructor(userToken) {
        this.logger = new Logger(); // Initialize the Logger for error and information logging.
        this.db = new MySQL(); // Initialize the MySQL database connection utility.
        this.userToken = userToken; // User token used to identify the user.
        this.googleAuthenticator = null; // Placeholder for the GoogleAuthenticator instance.
    }

    /**
     * Private method to set up the Google Authenticator instance.
     * - Connects to the database.
     * - Fetches the user details using the provided token.
     * - Initializes the Google Authenticator with the user's ID.
     * 
     * @returns {boolean} True if setup is successful, false otherwise.
     */
    async #setup() {
        try {
            await this.db.connect(); // Connect to the database.

            const user = await this.getUserDetails(['userId']); // Fetch user details by token.

            if (user) {
                this.googleAuthenticator = new GoogleAuthenticator(user.userId); // Initialize Google Authenticator.
                return true; // Setup successful.
            } else {
                return false; // User not found.
            }
        } catch (error) {
            this.logger.write("Something went wrong in setup [Service]: " + error, "2fa/error"); // Log any setup errors.
            return false; // Return false if an error occurs.
        } finally {
            this.db.disconnect(); // Disconnect from the database.
        }
    }

    /**
     * Generates a new secret for 2FA and returns the corresponding QR code URL.
     * 
     * @returns {string|boolean} QR code URL as a string or false if an error occurs.
     */
    async generateSecret() {
        try {
            await this.#setup(); // Ensure Google Authenticator is set up.
            const createSecret = await this.googleAuthenticator.generateSecret(); // Generate a new 2FA secret.

            if (createSecret) {
                const qrCode = await this.googleAuthenticator.getQRCodeUrl(); // Get the QR code URL for the secret.
                return qrCode.toString(); // Return the QR code URL as a string.
            }
        } catch (error) {
            console.log(error);

            this.logger.write('Error generating secret [Service]: ' + JSON.stringify(error), '2fa/error'); // Log errors.
            return false; // Return false if an error occurs.
        } finally {
            this.db.disconnect(); // Disconnect from the database.
        }
    }

    /**
     * Verifies a provided 2FA code against the stored secret.
     * 
     * @param {string} code - The 2FA code entered by the user.
     * @returns {boolean} True if the code is valid, false otherwise.
     */
    async verifyCode(code) {
        try {
            await this.#setup(); // Ensure Google Authenticator is set up.
            return this.googleAuthenticator.verifyToken(code); // Verify the provided 2FA code.
        } catch (error) {
            this.logger.write('Error verifying code [Service]: ' + JSON.stringify(error), '2fa/error'); // Log errors.
            return false; // Return false if an error occurs.
        } finally {
            this.db.disconnect(); // Disconnect from the database.
        }
    }

    /**
     * Fetches user details from the database using the user token.
     * 
     * @param {Array<string>} data - List of fields to fetch from the database.
     * @returns {Object|boolean} User details object or false if an error occurs.
     */
    async getUserDetails(data) {
        try {
            await this.db.connect(); // Connect to the database.
            return await this.db.table(tables.TBL_USERS) // Query the users table.
                .select(...data) // Select specified fields.
                .where('userAccessToken', this.userToken) // Filter by user token.
                .first(); // Fetch the first matching record.
        } catch (error) {
            console.log(error);

            this.logger.write("Error fetching user [Service]: " + JSON.stringify(error), "2fa/error"); // Log errors.
            return false; // Return false if an error occurs.
        } finally {
            this.db.disconnect(); // Disconnect from the database.
        }
    }
}

module.exports = TwoFactorAuthService; // Export the service class for use in other modules.
