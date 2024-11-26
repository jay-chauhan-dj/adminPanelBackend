/**
 * Author: Jay Chauhan
 * File: verifyUserRoutes.js
 * Description:
 * This file defines the routing logic for 2FA-related operations,
 * such as creating a new 2FA secret for a user.
 */

const express = require('express'); // Import Express for routing.
const VerifyUserController = require('../../controllers/VerifyUserController'); // Import the controller to handle the logic.
const router = express.Router(); // Create an Express router instance.

// Route to create a 2FA secret for a user.
router.post("/create", VerifyUserController.createSecret);

// Route to verify a 2FA secret for a user.
router.post("/verify", VerifyUserController.verifySecret);

module.exports = router; // Export the router for use in other parts of the application.
