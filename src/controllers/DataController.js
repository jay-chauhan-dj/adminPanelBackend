const MySQL = require('../utils/db/Mysql'); // Import the MySQL utility for database operations
const tables = require('../config/tables'); // Import table configurations
const Logger = require('../utils/logs/Logger'); // Import the Logger utility for logging

/**
 * @class DataController
 * @description Controller class for handling data-related operations such as fetching visits, bot visits, visitor OS, and bank balance.
 *              This class contains static methods that interact with the database and handle HTTP requests and responses.
 * @version 1.0.0
 * @date 2024-07-30
 * @author Jay Chauhan
 */
class DataController {

    /**
     * @function getVisits
     * @description Fetches the latest 10 days of visit counts from the database and returns them in the response.
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @returns {void}
     * @memberof DataController
     */
    static async getVisits(req, res) {
        const db = new MySQL(); // Create a new instance of the MySQL utility

        try {
            await db.connect(); // Connect to the database

            // Query visits data from the database
            const visits = await db.table(tables.TBL_VISITORS)
                .select("DATE(visitedDate) as visitedDate", "count(*) as visit_count")
                .groupBy("DATE(visitedDate)")
                .orderBy("visitedDate", "DESC")
                .limit(10)
                .get();

            res.status(200).json(visits); // Send the visits data as a JSON response
        } catch (error) {
            const logger = new Logger(); // Create a new instance of the Logger utility
            logger.write("Error in getting visits: " + error, "data/error"); // Log the error
            res.status(500).json({ message: 'Oops! Something went wrong!' }); // Send an error response
        } finally {
            await db.disconnect(); // Disconnect from the database
        }
    }

    /**
     * @function getBotVisits
     * @description Fetches the latest 10 days of bot visit counts from the database and returns them in the response.
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @returns {void}
     * @memberof DataController
     */
    static async getBotVisits(req, res) {
        const db = new MySQL(); // Create a new instance of the MySQL utility

        try {
            await db.connect(); // Connect to the database

            // Query bot visits data from the database
            const visits = await db.table(tables.TBL_VISITORS)
                .select("DATE(visitedDate) as visitedDate", "count(*) as visit_count")
                .where("os", "0")
                .orWhere("device", "Bot", "LIKE")
                .groupBy("DATE(visitedDate)")
                .orderBy("visitedDate", "DESC")
                .limit(10)
                .get();

            res.status(200).json(visits); // Send the bot visits data as a JSON response
        } catch (error) {
            const logger = new Logger(); // Create a new instance of the Logger utility
            logger.write("Error in getting bot visits: " + error, "data/error"); // Log the error
            res.status(500).json({ message: 'Oops! Something went wrong!' }); // Send an error response
        } finally {
            await db.disconnect(); // Disconnect from the database
        }
    }

    /**
     * @function getVisitorOs
     * @description Fetches the counts of visitors grouped by operating system and returns the percentage distribution in the response.
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @returns {void}
     * @memberof DataController
     */
    static async getVisitorOs(req, res) {
        const db = new MySQL(); // Create a new instance of the MySQL utility

        try {
            await db.connect(); // Connect to the database

            // Query the visitor OS data
            const visitorsOs = await db.table(tables.TBL_VISITORS)
                .select('os', 'count(*) as count')
                .groupBy('os')
                .get();

            // Calculate total count of visitors
            const total = visitorsOs.reduce((sum, os) => sum + os.count, 0);

            // Calculate percentage distribution
            const returnData = { other: { percentage: 0 } };
            visitorsOs.forEach(os => {
                const osKey = os.os.replace(" ", "_").toLowerCase();
                const percentage = Math.round((os.count / total) * 100 * 100) / 100; // Round to 2 decimal places
                switch (osKey) {
                    case "os_x":
                    case "windows":
                    case "linux":
                        returnData[osKey] = { percentage };
                        break;
                    default:
                        returnData.other.percentage += percentage;
                        break;
                }
            });

            res.status(200).json(returnData); // Send the OS percentage distribution as a JSON response
        } catch (error) {
            const logger = new Logger(); // Create a new instance of the Logger utility
            logger.write("Error in getting visitors OS: " + error, "data/error"); // Log the error
            res.status(500).json({ message: 'Oops! Something went wrong!' }); // Send an error response
        } finally {
            await db.disconnect(); // Disconnect from the database
        }
    }
}

module.exports = DataController; // Export the DataController class
