/**
 * Author: Jay Chauhan
 * Class Name: GoogleAuthenticator
 * Description:
 * This class handles the integration of Google Authenticator for two-factor authentication (2FA).
 * It provides methods to generate a 2FA secret, generate a QR code URL, and verify 2FA tokens.
 */

const speakeasy = require('speakeasy'); // Library for handling TOTP-based two-factor authentication.
const qrcode = require('qrcode'); // Library for generating QR codes.
const Logger = require('../../utils/logs/Logger'); // Logger utility for logging errors and information.
const MySQL = require('../../utils/db/Mysql'); // MySQL utility for database interactions.
const tables = require('../../config/tables'); // Configuration file containing table names.

class GoogleAuthenticator {
    constructor(userId) {
        this.logger = new Logger(); // Initialize the Logger for error and information logging.
        this.db = new MySQL(); // Initialize the MySQL database connection utility.
        this.userId = userId; // User ID for whom the 2FA is being managed.
    }

    /**
     * Generates a 2FA secret for the user and updates the database with the secret and its OTPAuth URL.
     * 
     * @returns {boolean|number} The number of rows updated or false if an error occurs.
     */
    async generateSecret() {
        try {
            await this.db.connect(); // Establish a connection to the database.

            // Fetch user details (e.g., first and last name) using the user ID.
            const userDetails = await this.db.table(tables.TBL_USERS)
                .select('userFirstName', 'userLastName')
                .where('userId', this.userId)
                .first();

            if (userDetails) {
                const appName = process.env.APP_NAME; // Application name from environment variables.
                const name = userDetails.userFirstName + ' ' + userDetails.userLastName; // Concatenate user name.

                // Configuration for the authenticator secret.
                const authenticatorConfig = {
                    length: 20,
                    name: `${appName}: (${name})`, // User-specific name for the authenticator.
                    issuer: appName, // Issuer (application name).
                };

                const secret = speakeasy.generateSecret(authenticatorConfig); // Generate a secret.

                // Prepare update details to save the secret and its OTPAuth URL in the database.
                const updateDetails = {
                    user2faSecret: secret.base32, // Base32 encoded secret.
                    user2faQr: secret.otpauth_url // OTPAuth URL for generating QR code.
                };

                // Update the user's record in the database.
                const response = await this.db.table(tables.TBL_USERS)
                    .where('userId', this.userId)
                    .update(updateDetails);

                return response; // Return the number of updated rows.
            } else {
                // Log an error if the user is not found.
                this.logger.write('Error generating secret: User Not Found For USER ID=' + this.userId, '2fa/google/error');
                return false;
            }
        } catch (error) {
            // Log any errors during secret generation.
            this.logger.write('Error generating secret: ' + JSON.stringify(error), '2fa/google/error');
            return false;
        } finally {
            this.db.disconnect(); // Disconnect from the database.
        }
    }

    /**
     * Retrieves the OTPAuth URL from the database and generates a QR code URL.
     * 
     * @returns {string|boolean} QR code URL as a string or false if an error occurs.
     */
    async getQRCodeUrl() {
        try {
            await this.db.connect(); // Establish a connection to the database.

            // Fetch the 2FA secret from the database.
            const userDetails = await this.db.table(tables.TBL_USERS)
                .select('user2faQr')
                .where('userId', this.userId)
                .first();

            if (userDetails) {
                const otpauthUrl = userDetails.user2faQr; // Retrieve the OTPAuth URL.
                const qrCode = await qrcode.toDataURL(otpauthUrl); // Generate a QR code as a Data URL.
                return qrCode; // Return the QR code URL.
            }
            return false; // Return false if no user details are found.
        } catch (error) {
            // Log any errors during QR code generation.
            this.logger.write('Error generating QR: ' + JSON.stringify(error), '2fa/google/error');
            return false;
        } finally {
            this.db.disconnect(); // Disconnect from the database.
        }
    }

    /**
     * Verifies a given TOTP token against the stored 2FA secret.
     * 
     * @param {string} token - The 2FA token provided by the user.
     * @returns {boolean} True if the token is valid, false otherwise.
     */
    async verifyToken(token) {
        try {
            await this.db.connect(); // Establish a connection to the database.

            // Fetch the user's 2FA secret from the database.
            const userDetails = await this.db.table(tables.TBL_USERS)
                .select('user2faSecret')
                .where('userId', this.userId)
                .first();


            if (userDetails && userDetails.user2faSecret) {
                // Verify the provided token using the user's secret.
                return speakeasy.totp.verify({
                    secret: userDetails.user2faSecret, // User's 2FA secret.
                    encoding: 'base32', // Encoding format of the secret.
                    token, // Token to verify.
                    window: 1, // Allow for slight time variations.
                });
            }
            return false; // Return false if user details or secret is missing.
        } catch (error) {
            // Log any errors during token verification.
            this.logger.write('Error verifying user: ' + JSON.stringify(error), '2fa/google/error');
            return false;
        } finally {
            this.db.disconnect(); // Disconnect from the database.
        }
    }
}

module.exports = GoogleAuthenticator; // Export the class for use in other modules.
