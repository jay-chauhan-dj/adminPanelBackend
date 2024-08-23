const express = require('express');
const router = express.Router();
const EventController = require('../../controllers/EventController');

// Mail routes
router.post("/trigger", EventController.trigger);

// Export Router
module.exports = router;