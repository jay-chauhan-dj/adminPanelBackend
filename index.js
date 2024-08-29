// Load environment variables from a .env file into process.env
require('dotenv').config(); // Loads environment variables

// Import the Express module to create the server and handle requests
const express = require('express'); // Web framework for Node.js

// Create an instance of an Express application
const app = express(); // Express application instance

// Import the routes for your application from the specified file
const appRoute = require('./src/routes/routes'); // Your route handlers

// Import the custom error-handling middleware
const errorMiddleware = require('./src/middleware/errorMiddleware'); // Middleware for handling errors

// Use the imported routes for handling requests to the '/v1' path
app.use('/v1', appRoute); // Route handling for '/v1'

// Register the custom error-handling middleware to catch and handle errors
app.use(errorMiddleware); // Error-handling middleware

// Define the port number to listen on, using the environment variable or defaulting to 3000
const PORT = process.env.PORT || 3000; // Port configuration

// Start the server and listen for incoming requests on the specified port
app.listen(PORT, () => {
    // Log a message indicating that the server is running and on which port
    console.log(`Server is running on port ${PORT}`); // Server start message
});
