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

// Use public routes without middleware
router.use(publicRoutes);

// Use protected routes with middleware
router.use(privateRoutes);

module.exports = router;