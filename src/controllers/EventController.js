const MySQL = require('../utils/db/Mysql'); // MySQL utility for database operations
const tables = require('../config/tables'); // Configuration for database tables
const Logger = require('../utils/logs/Logger'); // Logger utility for logging errors and messages
const Event = require('../utils/event/Event'); // Event utility for handling events
const { date } = require('../utils/functions'); // Utility function to get the current date

/**
 * @class EventController
 * @description Controller class responsible for managing event-related operations. This class handles retrieving event data from 
 *              the database, processing events, and updating their statuses. It is designed to ensure that all events due for 
 *              processing are handled appropriately.
 * @version 1.0.0
 * @date 2024-08-15
 * @author Jay Chauhan
 */
class EventController {
    /**
     * @static
     * @async
     * @route POST /trigger-events
     * @description Retrieves pending events from the database that are due for processing, processes each event, and updates 
     *              the event status. The method sends an immediate response to confirm receipt of the request, while event 
     *              processing happens asynchronously.
     * @param {Object} req - The request object containing data from the client. Not used in this method.
     * @param {Object} res - The response object used to send back the result to the client.
     * @returns {Promise<void>} - Sends a JSON response indicating the status of the event triggering operation.
     */
    static async trigger(req, res) {
        const db = new MySQL(); // Instantiate the MySQL utility for performing database operations

        try {
            await db.connect(); // Establish a connection to the database

            // Query the database for events that are due for processing and have a pending status
            const events = await db.table(tables.TBL_EVENTS) // Access the specified events table
                .select("*") // Retrieve all columns from the table
                .where("eventTimestamp", date(), "<=") // Filter for events where the timestamp is less than or equal to the current date
                .where("eventStatus", "0") // Filter for events with a status of '0' indicating pending
                .get(); // Execute the query and retrieve the results

            // Iterate over the fetched events and process each one
            events.forEach(async (event) => {
                const eventProcessor = new Event(event); // Create an Event instance for processing

                try {
                    await eventProcessor.handleEvent(); // Process the event and wait for the operation to complete
                } catch (error) {
                    // Log any errors encountered during the event processing
                    const logger = new Logger();
                    logger.write("Error processing event: " + error, "event/error");
                }
            });

            // Send an immediate response to confirm receipt of the request
            res.status(200).json({ message: 'Events triggered successfully' });
        } catch (error) {
            // Log any errors encountered during the database operation or while fetching events
            const logger = new Logger();
            logger.write("Error fetching events: " + error, "event/error");
            res.status(500).json({ message: 'Error processing events' }); // Send an error response if something goes wrong
        } finally {
            // Ensure that the database connection is closed regardless of the outcome
            await db.disconnect();
        }
    }
}

module.exports = EventController; // Export the EventController class for use in other parts of the application
