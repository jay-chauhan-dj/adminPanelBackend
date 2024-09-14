const express = require('express');
const router = express.Router();
const RoutesController = require('../../controllers/RoutesController');

// MenuItems routes

// Get MenuItems
router.post("/getMenuItems", RoutesController.getMenuItems);

// Export Router
module.exports = router;