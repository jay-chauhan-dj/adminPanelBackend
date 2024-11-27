const tables = require('../config/tables');
const MySQL = require('./db/Mysql');

/**
 * Retrieves user information by access token from the database.
 * 
 * @param {string} token - The access token to query.
 * @returns {Promise<Object>} - An object containing userAccessToken, userRefreshToken, and userEmail.
 * @throws {Error} - Throws an error if the database connection or query fails.
 * 
 * @example
 * const user = await getUserByToken('someAccessToken');
 * console.log(user);
 * 
 * @author Jay Chauhan
 */
const getUserByToken = async (token) => {
    const db = new MySQL(); // Instantiate the MySQL connection wrapper
    await db.connect(); // Establish the database connection

    // Query the database for the user matching the provided token
    const user = await db.table(tables.TBL_USERS)
        .select("userAccessToken", "userRefreshToken", "userEmail") // Select specific user fields
        .where("userAccessToken", token) // Filter by access token
        .first(); // Retrieve the first matching result

    await db.disconnect(); // Close the database connection
    return user; // Return the user data
}

/**
 * Encodes a string into Base64 format.
 * 
 * @param {string} data - The string to encode.
 * @returns {string} - The Base64 encoded string.
 * 
 * @example
 * const encoded = base64Encode("Hello");
 * console.log(encoded); // Outputs: "SGVsbG8="
 */
const base64Encode = (data) => {
    return Buffer.from(data).toString('base64'); // Encode the data to Base64 format
}

/**
 * Formats a date string or the current date/time into a specified format.
 * 
 * @param {string} [format='YYYY-MM-DD HH:mm:ss'] - The desired date format.
 * @param {string} [dateInput=null] - An optional date string; uses current date if null.
 * @returns {string} - The formatted date string.
 * @throws {Error} - Throws an error for invalid date input.
 * 
 * @example
 * const formattedDate = date('YYYY/MM/DD', '2023-11-22');
 * console.log(formattedDate); // Outputs: "2023/11/22"
 * 
 * @example
 * const formattedDate = date('MMMM DD, YYYY', '2023-11-22');
 * console.log(formattedDate); // Outputs: "November 22, 2023"
 */
const date = (format = 'YYYY-MM-DD HH:mm:ss', dateInput = null) => {
    const now = dateInput ? new Date(dateInput) : new Date(); // Use provided date or current date

    if (isNaN(now.getTime())) {
        throw new Error('Invalid date input'); // Check for invalid dates
    }

    // Month names for formatting
    const monthNamesFull = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthNamesShort = monthNamesFull.map(name => name.slice(0, 3));

    // Extract date and time components
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = String(now.getDate()).padStart(2, '0');
    const hours24 = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    // Convert to 12-hour format and determine AM/PM
    const hours12 = hours24 % 12 || 12;
    const ampm = hours24 >= 12 ? 'PM' : 'AM';

    // Map format placeholders to their values
    const formatMap = {
        'YYYY': year,
        'YY': String(year).slice(-2),
        'MMMM': monthNamesFull[month],
        'MMM': monthNamesShort[month],
        'MM': String(month + 1).padStart(2, '0'),
        'M': month + 1,
        'DD': day,
        'HH': String(hours24).padStart(2, '0'),
        'hh': String(hours12).padStart(2, '0'),
        'mm': minutes,
        'ss': seconds,
        'A': ampm
    };

    // Replace placeholders in the format string
    let formattedDate = format;
    for (const [placeholder, value] of Object.entries(formatMap)) {
        formattedDate = formattedDate.replace(new RegExp(placeholder, 'g'), value);
    }

    return formattedDate;
};

/**
 * Converts formatted text (markdown-like) into plain text.
 * 
 * @param {string} formattedText - The text containing markdown and HTML entities.
 * @returns {string} - Plain text without formatting or HTML entities.
 * 
 * @example
 * const plainText = convertToPlainText("*Hello* <b>world</b>");
 * console.log(plainText); // Outputs: "Hello world"
 */
const convertToPlainText = (formattedText) => {
    const { decode } = require('html-entities'); // Import HTML entity decoder

    let text = decode(formattedText); // Decode HTML entities
    text = text.replace(/\*([^*]+)\*/g, '$1') // Remove asterisks
        .replace(/_([^_]+)_/g, '$1'); // Remove underscores
    text = text.replace(/\n+/g, ' '); // Replace newlines with spaces
    return text.trim(); // Trim extra spaces
}

/**
 * Retrieves a configuration option value from the database by its key.
 * 
 * @param {string} key - The key of the option to retrieve.
 * @returns {Promise<string>} - The value of the requested option.
 * 
 * @example
 * const optionValue = await getOption('site_name');
 * console.log(optionValue); // Outputs: "My Website"
 */
const getOption = async (key) => {
    const db = new MySQL(); // Instantiate the MySQL connection wrapper
    await db.connect(); // Establish the database connection

    // Query the database for the option value based on the key
    const data = await db.table(tables.TBL_OPTIONS)
        .select("optionValue") // Select the option value field
        .where("optionKey", key) // Filter by the key
        .first(); // Retrieve the first matching result

    await db.disconnect(); // Close the database connection
    return data.optionValue; // Return the option value
}

/**
 * Updates the value of a specific configuration option in the database.
 * 
 * @param {string} key - The key of the option to update.
 * @param {string} value - The new value to set for the option.
 * @returns {Promise<number>} - The number of affected rows (should be 1 if successful).
 * @throws {Error} - Throws an error if the database connection or update query fails.
 * 
 * @example
 * const result = await setOption('site_name', 'New Website Name');
 * console.log(result); // Outputs: 1 (if successful)
 */
const setOption = async (key, value) => {
    const db = new MySQL(); // Instantiate the MySQL connection wrapper
    await db.connect(); // Establish the database connection

    // Update the option value in the database for the given key
    const data = await db.table(tables.TBL_OPTIONS)
        .where("optionKey", key) // Match the option by its key
        .update({ optionValue: value }); // Update the value of the option

    await db.disconnect(); // Close the database connection
    return data; // Return the number of affected rows
}

/**
 * Pads a number or string to a specified total length with a given character.
 *
 * @param {number|string} num - The number or string to pad. If a number, it will be converted to a string.
 * @param {number} length - The desired total length of the output string.
 * @param {string} char - The character to use for padding. Typically a single character like '0' or ' '.
 * @returns {string} - The padded string with the specified character up to the desired length.
 *
 * @example
 * stringPad(1, 6, '0');       // "000001"
 * stringPad(42, 8, '*');      // "******42"
 * stringPad('test', 10, '-'); // "------test"
 * stringPad(1234, 4, '0');    // "1234" (no padding as length is already 4)
 */
const stringPad = (num, length, char) => {
    return String(num).padStart(length, char);
}

// Export all the functions
module.exports = {
    getUserByToken,
    base64Encode,
    date,
    convertToPlainText,
    getOption,
    setOption,
    stringPad
};
