const Logger = require('../utils/logs/Logger'); // Import the Logger utility for logging

const express = require('express');
const cors = require('cors');

const router = express.Router();

const privateRoutes = require('./privateRoutes');
const publicRoutes = require('./publicRoutes');
const jsonErrorHandler = require('../handlers/BadRequestErrorHandler');
const generalErrorHandler = require('../handlers/ServerErrorHandler');

// Use CORS middleware
router.use(cors());

// Middleware to parse JSON bodies
router.use(express.json());

// Middleware to parse URL-encoded bodies
router.use(express.urlencoded({ extended: true }));

// Json Error Handler
router.use(jsonErrorHandler);

// Custom middleware to handle general errors
router.use(generalErrorHandler);

const logger = new Logger(); // Create a new instance of the Logger utility
logger.write("Url Details: " + JSON.stringify(req.originalUrl), "request/request"); // Log the error
logger.write("Headers Details: " + JSON.stringify(req.rawHeaders), "request/request"); // Log the error
logger.write("Body Details: " + JSON.stringify(req.body), "request/request"); // Log the error

// Use public routes without middleware
router.use(publicRoutes);

// Use protected routes with middleware
router.use(privateRoutes);

module.exports = router;