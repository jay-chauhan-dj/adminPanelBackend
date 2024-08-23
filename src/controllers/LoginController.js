const MySQL = require('../utils/db/Mysql'); // Import the MySQL utility for database operations
const Mail = require('../utils/mail/Mail'); // Import the Mail utility for sending emails
const tables = require('../config/tables'); // Import table configurations
const crypto = require('crypto'); // Import the crypto module for generating secure OTP and hashes
const Logger = require('../utils/logs/Logger'); // Import the Logger utility for logging

/**
 * @class LoginController
 * @description Controller class for handling login, OTP sending, and email verification.
 * @version 1.0.0
 * @date 2024-07-30
 * @author Jay Chauhan
 */
class LoginController {
    /**
     * @function login
     * @description Handles the login request and verifies the user credentials.
     * @param {Request} req - The Express request object.
     * @param {Response} res - The Express response object.
     * @returns {Promise<void>}
     */
    static async login(req, res) {
        const db = new MySQL(); // Create a new instance of the MySQL utility
        try {
            const loginData = {
                username: req.body.username, // Get the username from the request body
                password: req.body.password, // Get the password from the request body
                otp: req.body.otp, // Get the OTP from the request body
                loginKey: req.headers.loginkey // Get the login key from the request headers
            };

            // Connect to the database
            await db.connect();

            // Query the user information from the database
            const user = await db.table(tables.TBL_USERS)
                .select("userId", "userFirstName", "userLastName", "userPassword", "userEmail", "userPhoneNumber", "userAccessToken", "userRefreshToken")
                .where("userLogin", loginData.username)
                .first();

            // Check if user exists and password is correct
            if (user) {
                if (LoginController.#sha1(loginData.password) === user.userPassword) {
                    // Query verification data
                    const verificationData = await db.table(tables.TBL_USER_VERIFICATION_DETAILS)
                        .select("*")
                        .where("verificationUserId", user.userId)
                        .where("verificationType", "1")
                        .where("verificationStatus", "1")
                        .get();

                    // Verify user based on OTP or login key
                    if (verificationData) {
                        if (await LoginController.#verifyUser(verificationData, loginData, db)) {
                            res.status(200).json({ message: `Welcome ${user.userFirstName} ${user.userLastName}`, accessToken: user.userAccessToken, refreshToken: user.userRefreshToken });
                        } else {
                            res.status(401).json({ message: 'Invalid OTP' });
                        }
                    } else {
                        res.status(401).json({ message: 'Invalid credentials' });
                    }
                } else {
                    res.status(401).json({ message: 'Invalid credentials' });
                }
            } else {
                res.status(404).json({ message: 'User not found' });
            }
        } catch (error) {
            const logger = new Logger(); // Create a new instance of the Logger utility
            // Log the error
            logger.write("Error in Login: " + error, "login/error");
            res.status(500).json({ message: 'Oops! Something went wrong!' });
        } finally {
            // Disconnect from the database
            await db.disconnect();
        }
    }

    /**
     * @function sendOtp
     * @description Sends an OTP to the user's email for login verification.
     * @param {Request} req - The Express request object.
     * @param {Response} res - The Express response object.
     * @returns {Promise<void>}
     */
    static async sendOtp(req, res) {
        const email = new Mail(); // Create a new instance of the Mail utility
        const db = new MySQL(); // Create a new instance of the MySQL utility

        try {
            const inputData = {
                username: req.body.username, // Get the username from the request body
                password: req.body.password // Get the password from the request body
            };

            // Connect to the database
            await db.connect();

            // Query user information from the database
            const user = await db.table(tables.TBL_USERS)
                .select("userId", "userPassword", "userEmail", "userPhoneNumber")
                .where("userLogin", inputData.username)
                .first();

            // Check if user exists and password is correct
            if (user) {
                if (LoginController.#sha1(inputData.password) === user.userPassword) {
                    const otp = LoginController.#generateOtp(); // Generate an OTP
                    const templateData = {
                        loginId: user.userLogin,
                        otp: otp
                    };

                    // Send OTP email
                    await email.sendEmailTemplate(1, templateData, user.userEmail);

                    // Insert OTP verification details into the database
                    const otpVerificationData = {
                        verificationUserId: user.userId,
                        verificationType: "1",
                        verificationKeyType: "1",
                        verificationValue: otp,
                        verificationStatus: "1",
                    };
                    await db.table(tables.TBL_USER_VERIFICATION_DETAILS).insert(otpVerificationData);

                    // Generate and insert login key verification details
                    const loginKey = LoginController.#sha1(inputData.password + otp + user.userPassword);
                    const loginKeyVerificationData = {
                        verificationUserId: user.userId,
                        verificationType: "1",
                        verificationKeyType: "2",
                        verificationValue: loginKey,
                        verificationStatus: "1",
                    };
                    await db.table(tables.TBL_USER_VERIFICATION_DETAILS).insert(loginKeyVerificationData);

                    res.status(200).json({ message: 'OTP sent successfully', loginKey: loginKey, otpSent: true });
                } else {
                    res.status(401).json({ message: 'Invalid credentials' });
                }
            } else {
                res.status(404).json({ message: 'User not found' });
            }
        } catch (error) {
            const logger = new Logger(); // Create a new instance of the Logger utility
            // Log the error
            logger.write("Error in sendOtp: " + error, "login/error");
            res.status(500).json({ message: 'Oops! Something went wrong!' });
        } finally {
            // Disconnect from the database
            await db.disconnect();
        }
    }

    /**
     * @function sendVerificationMail
     * @description Sends a verification email with a verification token to the user's email.
     * @param {Request} req - The Express request object.
     * @param {Response} res - The Express response object.
     * @returns {Promise<void>}
     */
    static async sendVerificationMail(req, res) {
        const email = new Mail(); // Create a new instance of the Mail utility
        const db = new MySQL(); // Create a new instance of the MySQL utility

        try {
            // Connect to the database
            await db.connect();

            const emailId = req.body.email; // Get the email ID from the request body

            // Query user information from the database
            const user = await db.table(tables.TBL_USERS)
                .select("userId", "userLogin", "userAccessToken", "userRefreshToken", "userFirstName", "userLastName")
                .where("userEmail", emailId)
                .first();

            // Check if user exists
            if (user) {
                // Generate verification token
                const verificationToken = LoginController.#sha1(user.email + user.userAccessToken + user.userRefreshToken + LoginController.#generateOtp());

                // Insert verification details into the database
                const verificationData = {
                    verificationUserId: user.userId,
                    verificationType: "2",
                    verificationKeyType: "2",
                    verificationValue: verificationToken,
                    verificationStatus: "1",
                };
                if (await db.table(tables.TBL_USER_VERIFICATION_DETAILS).insert(verificationData)) {
                    const emailResponse = await email.sendEmailTemplate(2, { emailVerificationLink: verificationToken }, emailId); // Send verification email
                    if (emailResponse.status == "success") {
                        res.status(200).json({ message: 'Verification link sent successfully' });
                    } else {
                        res.status(500).json({ message: 'Failed to send verification link! Please Try After Sometime.' });
                    }
                } else {
                    res.status(500).json({ message: 'Oops! Something went wrong!' });
                }
            } else {
                res.status(404).json({ message: 'Please enter registered email!' });
            }
        } catch (error) {
            const logger = new Logger(); // Create a new instance of the Logger utility
            // Log the error
            logger.write("Error in EmailVerificationLink: " + error, "login/error");
            res.status(500).json({ message: 'Oops! Something went wrong!' });
        } finally {
            // Disconnect from the database
            await db.disconnect();
        }
    }

    /**
     * @function verifyEmail
     * @description Verifies the user's email using the provided verification token.
     * @param {Request} req - The Express request object.
     * @param {Response} res - The Express response object.
     * @returns {Promise<void>}
     */
    static async verifyEmail(req, res) {
        const db = new MySQL(); // Create a new instance of the MySQL utility

        try {
            // Connect to the database
            await db.connect();

            const emailToken = req.params.token; // Get the verification token from the request parameters

            // Query user information from the database using the verification token
            const user = await db.table(tables.TBL_USERS + " u")
                .join(tables.TBL_USER_VERIFICATION_DETAILS + " v", "v.verificationUserId=u.userId")
                .select("u.userId")
                .where("v.verificationValue", emailToken)
                .where("verificationKeyType", "2")
                .where("verificationType", "2")
                .where("v.verificationStatus", "1")
                .orderBy("verificationCreatedDate", "DESC")
                .first();

            // Check if user exists and update verification status
            if (user) {
                const userUpdateDetails = {
                    userIsEmailVerified: "1"
                };
                if (await db.table(tables.TBL_USERS).where("userId", user.userId).update(userUpdateDetails)) {
                    const verificationDetailsUpdate = {
                        verificationStatus: 2
                    };
                    if (await db.table(tables.TBL_USER_VERIFICATION_DETAILS).where("verificationValue", emailToken).update(verificationDetailsUpdate)) {
                        res.status(200).json({ message: 'Email verified successfully' });
                    } else {
                        const logger = new Logger(); // Create a new instance of the Logger utility
                        // Log the error
                        logger.write("Error in updating verification status: " + user.userId, "login/error");
                        res.status(200).json({ message: 'Email verified successfully' });
                    }
                } else {
                    const logger = new Logger(); // Create a new instance of the Logger utility
                    // Log the error
                    logger.write("Error in updating user status: " + user.userId, "login/error");
                    res.status(500).json({ message: 'Failed to verify the email!' });
                }
            } else {
                res.status(404).json({ message: 'Verification link expired!' });
            }
        } catch (error) {
            const logger = new Logger(); // Create a new instance of the Logger utility
            // Log the error
            logger.write("Error in EmailVerification: " + error, "login/error");
            res.status(500).json({ message: 'Oops! Something went wrong!' });
        } finally {
            // Disconnect from the database
            await db.disconnect();
        }
    }

    /**
     * @function #generateOtp
     * @description Generates a secure OTP (One-Time Password) consisting of digits only.
     * @param {number} length - The length of the OTP to generate.
     * @returns {string} - The generated OTP.
     * @private
     */
    static #generateOtp(length = 6) {
        const digits = '0123456789';
        let otp = '';
        for (let i = 0; i < length; i++) {
            const randomIndex = crypto.randomInt(0, digits.length);
            otp += digits[randomIndex];
        }
        return otp;
    }

    /**
     * @function #sha1
     * @description Generates a SHA-1 hash for the given data.
     * @param {string} data - The data to hash.
     * @returns {string} - The generated SHA-1 hash.
     * @private
     */
    static #sha1(data) {
        return crypto.createHash('sha1').update(data, 'utf8').digest('hex');
    }

    /**
     * @function #verifyUser
     * @description Verifies the user based on OTP or login key.
     * @param {Array} verificationData - Array of verification details.
     * @param {Object} loginData - Object containing login details.
     * @param {Object} db - Database connection object.
     * @returns {Promise<boolean>} - True if verification is successful, false otherwise.
     * @private
     */
    static async #verifyUser(verificationData, loginData, db) {
        let response = false;
        for (const details of verificationData) {
            if (details.verificationKeyType === "1") {
                response = (details.verificationValue == loginData.otp);
            } else if (details.verificationKeyType === "2") {
                response = (details.verificationValue == loginData.loginKey);
            }
            const updateVerificationDetails = {
                verificationStatus: response ? "2" : "0"
            };
            await db.table(tables.TBL_USER_VERIFICATION_DETAILS).where("verificationId", details.verificationId).update(updateVerificationDetails);
        }
        return response;
    }
}

module.exports = LoginController; // Export the LoginController class
