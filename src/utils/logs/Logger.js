const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
require('dotenv').config();

/**
 * @class Logger
 * @description A class to provide logging services for the application.
 * @author Jay Chauhan
 */
class Logger {
    constructor() {
        this.rootDir = path.resolve(__dirname, process.env.LOG_ROOT_DIR || '../../log'); // Use relative path within projectss
    }

    /**
     * @function write
     * @description Writes the log details to the specified file.
     * @param {string|object} details - The details to be written in the log file.
     * @param {string} fileLocation - The location within the date folder where the log file should be saved (format: {folder}/{fileName}).
     * @returns {void}
     */
    write(details, fileLocation) {
        const now = new Date();
        const year = now.getFullYear().toString();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const date = String(now.getDate()).padStart(2, '0');

        const logDir = path.join(this.rootDir, year, month, date, path.dirname(fileLocation)); // Create directory structure
        const logFile = path.join(logDir, `${path.basename(fileLocation)}.log`); // Get the full log file path

        // Ensure the directory exists
        if (!fs.existsSync(logDir)) {
            try {
                fs.mkdirSync(logDir, { recursive: true });
            } catch (err) {
                console.error(`Error creating directory ${logDir}:`, err);
                return;
            }
        }

        // Format the details as a string
        const logEntry = typeof details === 'string' ? details : JSON.stringify(details, null, 2);

        // Append details to the log file
        try {
            fs.appendFileSync(logFile, `${now.toISOString()} - ${logEntry}\n`, 'utf8');
        } catch (err) {
            console.error(`Error writing to log file ${logFile}:`, err);
        }
    }

    /**
     * @function cleanupLogs
     * @description Deletes log files and directories older than 7 days.
     * @returns {void}
     */
    cleanupLogs() {
        const deleteOldFiles = (dirPath) => {
            const files = fs.readdirSync(dirPath);

            files.forEach((file) => {
                const filePath = path.join(dirPath, file);
                const stats = fs.statSync(filePath);
                const now = Date.now();
                const ageInDays = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);

                if (ageInDays > 7) {
                    if (stats.isDirectory()) {
                        // Recursively delete old directories
                        deleteOldFiles(filePath);
                        if (fs.readdirSync(filePath).length === 0) {
                            fs.rmdirSync(filePath);
                        }
                    } else {
                        // Delete old files
                        fs.unlinkSync(filePath);
                    }
                }
            });
        };

        // Start cleanup from the root log directory
        if (fs.existsSync(this.rootDir)) {
            deleteOldFiles(this.rootDir);
        }
    }
}

module.exports = Logger;
