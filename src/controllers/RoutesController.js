const MySQL = require('../utils/db/Mysql'); // Import the MySQL utility for database operations
const tables = require('../config/tables'); // Import table configurations
const Logger = require('../utils/logs/Logger'); // Import the Logger utility for logging

/**
 * @class RoutesController
 * @description Controller class for handling route fetching and menu hierarchy building.
 * @version 1.0.0
 * @date 2024-07-30
 * @author Jay Chauhan
 */
class RoutesController {
    /**
     * @function getRoutes
     * @description Fetches route details from the database and sends them as JSON response.
     * @param {Object} req - The HTTP request object.
     * @param {Object} res - The HTTP response object.
     */
    static async getRoutes(req, res) {
        const db = new MySQL(); // Create a new instance of the MySQL utility

        try {
            await db.connect(); // Connect to the database
            const routesDetails = await db.table(tables.TBL_ROUTES).select('*').get(); // Fetch routes from the database
            const routes = routesDetails.map(route => ({
                path: route.routeUrl,
                element: route.routeComponentName,
                layout: route.routeTarget == "1" ? "blank" : "",
                componentLocation: route.routeComponentLocation,
                isPrivate: route.routeIsPrivate == "1",
            })); // Map the fetched routes to the required format
            res.status(200).json(routes); // Send the routes as JSON response
        } catch (error) {
            const logger = new Logger(); // Create a new instance of the Logger utility
            logger.write("Error in fetching routes: " + error, "routes/error"); // Log the error
            res.status(500).json({ message: 'Oops! Something went wrong!' }); // Send an error response
        } finally {
            await db.disconnect(); // Disconnect from the database
        }
    }

    /**
     * @function getMenuItems
     * @description Fetches menu items by building the menu hierarchy and sends them as JSON response.
     * @param {Object} req - The HTTP request object.
     * @param {Object} res - The HTTP response object.
     */
    static async getMenuItems(req, res) {
        try {
            const menuItems = await RoutesController.buildMenuHierarchy(); // Build the menu hierarchy
            res.status(200).json(menuItems); // Send the menu items as JSON response
        } catch (error) {
            const logger = new Logger(); // Create a new instance of the Logger utility
            logger.write("Error in fetching menu: " + error, "routes/error"); // Log the error
            res.status(500).json({ message: 'Oops! Something went wrong!' }); // Send an error response
        }
    }

    /**
     * @function buildMenuHierarchy
     * @description Builds the menu hierarchy from the database and returns it.
     * @returns {Array|Boolean} The menu hierarchy array or false in case of an error.
     */
    static async buildMenuHierarchy() {
        const db = new MySQL(); // Create a new instance of the MySQL utility
        let result = [];

        try {
            await db.connect(); // Connect to the database
            const menuDetails = await db.table(tables.TBL_MENU_ITEMS + ' m')
                .join(tables.TBL_ROUTES + ' r', 'r.routeId=m.menuRouteId')
                .select('m.menuId', 'm.menuTitle', 'm.menuSvg', 'm.menuType', 'r.routeUrl', 'm.menuParentId', 'm.menuIsActive')
                .where('m.menuIsActive', 1)
                .get(); // Fetch menu items with their associated routes from the database

            const menuMap = {}; // Create a map to store menu items by their IDs
            const rootMenus = []; // Create an array to store root menu items

            // Populate the menuMap with menu details
            menuDetails.forEach(menu => {
                menuMap[menu.menuId] = {
                    menuTitle: menu.menuTitle,
                    menuSvg: menu.menuSvg,
                    menuType: menu.menuType,
                    menuRoute: menu.routeUrl,
                    menuParentId: menu.menuParentId,
                    menuIsActive: menu.menuIsActive,
                    children: []
                };
            });

            // Build the hierarchy by associating children with their parents
            menuDetails.forEach(menu => {
                if (menu.menuParentId === null) {
                    rootMenus.push(menuMap[menu.menuId]); // Add root menus to the rootMenus array
                } else {
                    if (menuMap[menu.menuParentId]) {
                        menuMap[menu.menuParentId].children.push(menuMap[menu.menuId]); // Add child menus to their parent menu
                    }
                }
            });

            result = rootMenus; // Set the result to the built menu hierarchy
        } catch (error) {
            const logger = new Logger(); // Create a new instance of the Logger utility
            logger.write("Error in fetching menu: " + error, "routes/error"); // Log the error
            result = false; // Set the result to false in case of an error
        } finally {
            await db.disconnect(); // Disconnect from the database
        }
        return result; // Return the built menu hierarchy
    }
}

module.exports = RoutesController; // Export the RoutesController class
