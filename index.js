require('dotenv').config();
const express = require('express');
const app = express();
const appRoute = require('./src/routes/routes');

app.use('/v1', appRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
