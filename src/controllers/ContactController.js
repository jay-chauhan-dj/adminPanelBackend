const MySQL = require('../utils/db/Mysql'); // Import the MySQL utility for database operations
const tables = require('../config/tables'); // Import table configurations
const Logger = require('../utils/logs/Logger'); // Import the Logger utility for logging

class ContactController {
    static async getContacts(req, res) {
        try {
            const db = new MySQL();

            await db.connect();
            const contacts = await db.table(tables.TBL_CONTACTS)
                .select("contactId as id", "contactFirstName as firstName", "contactLastName as lastName")
                .where("contactIsActive", "1")
                .get();
            await db.disconnect();
            res.status(200).json({ success: true, contacts: contacts });
        } catch (error) {
            const logger = new Logger();
            logger.write("Error creating secret [controller]: " + JSON.stringify(error), "verifyuser/error");
            res.status(500).json({ message: 'Oops! Something went wrong!' });
        }
    }
}

module.exports = ContactController; // Export the RoutesController class
