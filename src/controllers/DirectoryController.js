require('dotenv').config();  // Loading environment variables from a .env file
const Logger = require('../utils/logs/Logger'); // Import the Logger utility for logging
const HttpRequest = require('../utils/request/HttpRequest');
const MySQL = require('../utils/db/Mysql'); // Import the MySQL utility for database operations
const tables = require('../config/tables'); // Import table configurations

class DirectoryController {
    static async getDirectoryTree(req, res) {
        try {
            const headers = {
                "Content-Type": "application/json",
                "authorization": process.env.NAS_AUTH_TOKEN
            };
            const request = new HttpRequest(process.env.NAS_BASE_URL);
            const response = await request.postRequest("/fetchDirectoryTree", {}, headers);
            
            const fileConfig = await DirectoryController.#getFileTypes();
            var nasData = [];
            if (fileConfig) {
                nasData = DirectoryController.#updateJson(response, fileConfig);
                nasData.name = "DJ Jay's NAS"
                const icon = DirectoryController.#getFileIcon("folder", fileConfig); // Get the icon for folder or back type
                // Assign the corresponding icon to the item
                if (icon) {
                    nasData.iconSvg = icon.iconSvg;
                    nasData.iconColorClass = icon.iconColorClass;
                }
            } else {
                res.status(500).json({ message: 'Oops! Something went wrong!' });
                const logger = new Logger();
                logger.write("Error fetching directory config: " + JSON.stringify(error), "directory-list/error");
                res.status(500).json({ message: 'Oops! Something went wrong!' });
            }

            res.status(200).json({ success: true, directoryTree: nasData });
        } catch (error) {
            const logger = new Logger();
            logger.write("Error fetching directory: " + JSON.stringify(error), "directory-list/error");
            res.status(500).json({ message: 'Oops! Something went wrong!' });
        }
    }

    // function to fetch file types
    static async #getFileTypes() {
        try {
            const db = new MySQL(); // Create a new instance of the MySQL utility
            await db.connect();
            const fileConfig = await db.table(tables.TBL_FILE_ICONS).select("*").get();
            return fileConfig;
        } catch (error) {
            const logger = new Logger();
            logger.write("Error fetching file types: " + JSON.stringify(error), "directory-list/error");
            return false;
        }
    }

    // function to find the corresponding icon based on file extension
    static #getFileIcon(typeOrExtension, fileConfig) {
        // Loop through the fileConfig array to find the corresponding icon for fileType or extension
        for (const type of fileConfig) {
            
            // If it's a file type (folder or back), we match based on type
            if (type.fileType === typeOrExtension) {
                return { iconSvg: type.iconSvg, iconColorClass: type.iconColorClass };
            }
            
            // If it's a file extension, match accordingly
            if (type.fileExtensions && type.fileExtensions.includes(typeOrExtension)) {
                return { iconSvg: type.iconSvg, iconColorClass: type.iconColorClass };
            }
        }

        return null; // Return null if no icon found
    }

    // Recursive function to traverse and update the JSON structure
    static #updateJson(json, fileConfig) {
        json.children.forEach(item => {
            // If the item is a file (identified by the 'unknown' type), add the SVG icon
            if (item.type === 'file' && item.name) {
                
                const extension = item.name.split('.').pop().toLowerCase();
                const icon = DirectoryController.#getFileIcon(extension, fileConfig);
                if (icon) {
                    item.iconSvg = icon.iconSvg;
                    item.iconColorClass = icon.iconColorClass;
                }
            }

            // If the item is a folder, we recursively call updateJson on its children
            if (item.type === 'folder' || item.type === 'back') {
                const icon = DirectoryController.#getFileIcon(item.type, fileConfig); // Get the icon for folder or back type

                // Assign the corresponding icon to the item
                if (icon) {
                    item.iconSvg = icon.iconSvg;
                    item.iconColorClass = icon.iconColorClass;
                }

                DirectoryController.#updateJson(item, fileConfig); // Recursive call for nested folders
            }
        });
        return json; // Return the updated JSON
    }
}

module.exports = DirectoryController; // Export the DirectoryController class