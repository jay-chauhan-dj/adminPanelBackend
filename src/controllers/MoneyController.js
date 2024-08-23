const MySQL = require('../utils/db/Mysql'); // Import the MySQL utility for database operations
const tables = require('../config/tables'); // Import table configurations
const Logger = require('../utils/logs/Logger'); // Import the Logger utility for logging

/**
 * @class MoneyController
 * @version 1.0.0
 * @date 2024-07-30
 * @description The MoneyController class handles various financial-related operations such as fetching payment methods, banks, users, transactions, etc., interacting with the database.
 * @author Jay Chauhan
 */
class MoneyController {

    /**
     * @function getPaymentMethods
     * @description Fetches payment methods from the database based on the provided bank ID and returns them in the response.
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @returns {void}
     */
    static async getPaymentMethods(req, res) {
        const db = new MySQL(); // Create a new instance of the MySQL utility

        try {
            await db.connect(); // Connect to the database

            const bankId = req.query.bankId; // Extract bankId from query parameters

            // Query payment methods data from the database based on bankId
            const paymentMethods = await db.table(tables.TBL_PAYMENT_METHODS)
                .select("paymentMethodId", "paymentMethodName")
                .where("paymentMethodBankId", bankId)
                .get();

            res.status(200).json(paymentMethods); // Send the payment methods data as a JSON response
        } catch (error) {
            const logger = new Logger(); // Create a new instance of the Logger utility
            logger.write("Error in getting payment methods: " + error, "money/error"); // Log the error with a custom message
            res.status(500).json({ message: 'Oops! Something went wrong!' }); // Send an error response
        } finally {
            await db.disconnect(); // Disconnect from the database
        }
    }

    /**
     * @function getBanks
     * @description Fetches all bank details from the database and returns them in the response.
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @returns {void}
     */
    static async getBanks(req, res) {
        const db = new MySQL(); // Create a new instance of the MySQL utility

        try {
            await db.connect(); // Connect to the database

            // Query bank details data from the database
            const paymentMethods = await db.table(tables.TBL_BANK_DETAILS)
                .select("bankId", "bankName")
                .get();

            res.status(200).json(paymentMethods); // Send the bank details data as a JSON response
        } catch (error) {
            const logger = new Logger(); // Create a new instance of the Logger utility
            logger.write("Error in getting banks: " + error, "money/error"); // Log the error with a custom message
            res.status(500).json({ message: 'Oops! Something went wrong!' }); // Send an error response
        } finally {
            await db.disconnect(); // Disconnect from the database
        }
    }

    /**
     * @function getUsers
     * @description Fetches all users with a specific role ID from the database and returns them in the response.
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @returns {void}
     */
    static async getUsers(req, res) {
        const db = new MySQL(); // Create a new instance of the MySQL utility

        try {
            await db.connect(); // Connect to the database

            // Query user data from the database where userRoleId is 1
            const users = await db.table(tables.TBL_USERS)
                .select("userId", "userFirstName", "userLastName")
                .where("userRoleId", 1)
                .get();

            res.status(200).json(users); // Send the user data as a JSON response
        } catch (error) {
            const logger = new Logger(); // Create a new instance of the Logger utility
            logger.write("Error in getting users: " + error, "money/error"); // Log the error with a custom message
            res.status(500).json({ message: 'Oops! Something went wrong!' }); // Send an error response
        } finally {
            await db.disconnect(); // Disconnect from the database
        }
    }

    /**
     * @function saveTransection
     * @description Saves a new transaction in the database and updates the related bank balance accordingly.
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @returns {void}
     */
    static async saveTransection(req, res) {
        const db = new MySQL(); // Create a new instance of the MySQL utility

        try {
            await db.connect(); // Connect to the database

            const bankId = req.body.bank; // Extract bankId from request body

            // Prepare transaction details from request body
            const transectionDetails = {
                transactionUserId: req.body.userId,
                transectionPaymentMeyhodId: req.body.method,
                transectionTitle: req.body.title,
                transectionAmount: req.body.amount,
                transectionType: req.body.agree ? "1" : "0" // Determine transaction type based on 'agree' field
            };

            // Insert the new transaction into the database
            const insertedId = await db.table(tables.TBL_TRANSECTIONS).insert(transectionDetails);

            if (insertedId) {
                // Fetch the current bank balance from the database
                const balance = await db.table(tables.TBL_BANK_DETAILS).select("bankAccountBalance").where("bankId", bankId).first();

                // Calculate the new balance based on the transaction type
                const balanceDetails = {
                    bankAccountBalance: (transectionDetails.transectionType == "1" ? (parseFloat(balance.bankAccountBalance) + parseFloat(transectionDetails.transectionAmount)) : (parseFloat(balance.bankAccountBalance) - parseFloat(transectionDetails.transectionAmount)))
                }

                // Update the bank balance in the database
                await db.table(tables.TBL_BANK_DETAILS).where("bankId", bankId).update(balanceDetails);

                res.status(200).json({ message: "Transection inserted successfully!", "success": true }); // Send success response
            } else {
                const logger = new Logger(); // Create a new instance of the Logger utility
                logger.write("Error in inserting transection: " + JSON.stringify(transectionDetails), "money/error"); // Log the error with transaction details
                res.status(500).json({ message: "Transection not inserted successfully!", "success": false }); // Send failure response
            }
        } catch (error) {
            const logger = new Logger(); // Create a new instance of the Logger utility
            logger.write("Error in inserting transection: " + error, "money/error"); // Log the error with a custom message
            res.status(500).json({ message: 'Oops! Something went wrong!', "success": false }); // Send an error response
        } finally {
            await db.disconnect(); // Disconnect from the database
        }
    }

    /**
     * @function getTransectionSummary
     * @description Fetches a summary of transactions (expense, income, and transfer) from the database and returns it in the response.
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @returns {void}
     */
    static async getTransectionSummary(req, res) {
        const db = new MySQL(); // Create a new instance of the MySQL utility

        try {
            await db.connect(); // Connect to the database

            var response = {
                expance: 0,
                income: 0,
                transfer: 0
            };

            // Query transaction summary data from the database
            const transectionDetails = await db.table(tables.TBL_TRANSECTIONS)
                .select("sum(transectionAmount) as amount", "transectionType as type")
                .groupBy("transectionType")
                .get();

            // Categorize the amounts by transaction type
            transectionDetails.forEach(transection => {
                switch (transection.type) {
                    case "0":
                        response.expance = transection.amount;
                        break;
                    case "1":
                        response.income = transection.amount;
                        break;
                    case "2":
                        response.transfer = transection.amount;
                        break;
                }
            });

            res.status(200).json(response); // Send the transaction summary as a JSON response
        } catch (error) {
            const logger = new Logger(); // Create a new instance of the Logger utility
            logger.write("Error in transection summary: " + error, "money/error"); // Log the error with a custom message
            res.status(500).json({ message: 'Oops! Something went wrong!', "success": false }); // Send an error response
        } finally {
            await db.disconnect(); // Disconnect from the database
        }
    }

    /**
     * @function getRecentTransection
     * @description Fetches the most recent transactions from the database and returns them in the response.
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @returns {void}
     */
    static async getRecentTransection(req, res) {
        const db = new MySQL(); // Create a new instance of the MySQL utility

        try {
            await db.connect(); // Connect to the database

            // Query to fetch the most recent 5 transactions from the database
            const transections = await db.table(tables.TBL_TRANSECTIONS)
                .select("transectionAmount", "transectionType", "transectionTitle", "transectionTime")
                .orderBy("transectionTitle", "DESC")
                .limit(5)
                .get();

            res.status(200).json(transections); // Send the recent transactions as a JSON response
        } catch (error) {
            const logger = new Logger(); // Create a new instance of the Logger utility
            logger.write("Error in fetching recent transection: " + error, "money/error"); // Log the error with a custom message
            res.status(500).json({ message: 'Oops! Something went wrong!', "success": false }); // Send an error response
        } finally {
            await db.disconnect(); // Disconnect from the database
        }
    }

    /**
     * @function getBankBalance
     * @description Fetches the total bank balance for active accounts from the database and returns it in the response.
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @returns {void}
     * @memberof MoneyController
     */
    static async getBankBalance(req, res) {
        const db = new MySQL(); // Create a new instance of the MySQL utility

        try {
            await db.connect(); // Connect to the database

            // Query to get the total bank balance for active accounts
            const balanceData = await db.table(tables.TBL_BANK_DETAILS)
                .select("SUM(bankAccountBalance) as totalBalance")
                .where("bankAccountIsActive", "1")
                .first();

            res.status(200).json({ bankBalance: balanceData.totalBalance }); // Send the total bank balance as a JSON response
        } catch (error) {
            const logger = new Logger(); // Create a new instance of the Logger utility
            logger.write("Error in getting bank balance: " + error, "data/error"); // Log the error with a custom message
            res.status(500).json({ message: 'Oops! Something went wrong!' }); // Send an error response
        } finally {
            await db.disconnect(); // Disconnect from the database
        }
    }
}

module.exports = MoneyController; // Export the MoneyController class
