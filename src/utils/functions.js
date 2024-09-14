const MySQL = require('./db/Mysql');

const getUserByToken = async (token) => {
    const db = new MySQL();
    await db.connect();

    const user = await db.table("tblUsers")
        .select("userAccessToken", "userRefreshToken", "userEmail")
        .where("userAccessToken", token)
        .first();

    await db.disconnect();
    return user;
}

/**
 * Encodes data to base64 format.
 * @param {string} data - The data to be encoded.
 * @returns {string} - The base64 encoded string.
 * @author Jay Chauhan
 */
const base64Encode = (data) => {
    // Create a buffer from the input data and encode it to base64
    return Buffer.from(data).toString('base64');
}

/**
 * Formats the current date and time (or a specified date and time) according to a provided format string.
 * 
 * @param {string} [format='YYYY-MM-DD HH:mm:ss'] - The format string that specifies how the date and time should be formatted.
 * @param {string} [dateInput=null] - An optional date string to specify a particular date and time. If not provided, the current date and time is used.
 * @returns {string} The formatted date and time as a string.
 * @throws {Error} Throws an error if the provided dateInput is invalid.
 * 
 * @author Jay Chauhan
 */
const date = (format = 'YYYY-MM-DD HH:mm:ss', dateInput = null) => {
    // Create a Date object based on dateInput or use the current date and time
    const now = dateInput ? new Date(dateInput) : new Date();
    
    // Check if the created Date object is valid
    if (isNaN(now.getTime())) {
        throw new Error('Invalid date input');
    }

    // Extract date components
    const year = now.getFullYear(); // Full year (e.g., 2024)
    const month = now.getMonth(); // Month (0-based index, 0 = January, 11 = December)
    const day = String(now.getDate()).padStart(2, '0'); // Day of the month, padded to 2 digits (e.g., 01, 15)
    const hours24 = now.getHours(); // Hours in 24-hour format (0-23)
    const minutes = String(now.getMinutes()).padStart(2, '0'); // Minutes, padded to 2 digits (e.g., 00, 45)
    const seconds = String(now.getSeconds()).padStart(2, '0'); // Seconds, padded to 2 digits (e.g., 00, 59)

    // Convert 24-hour format to 12-hour format and determine AM/PM
    const hours12 = hours24 % 12 || 12; // Convert hours to 12-hour format, adjust for midnight (0 hours)
    const ampm = hours24 >= 12 ? 'PM' : 'AM'; // Determine AM/PM based on 24-hour time
    const hours24Str = String(hours24).padStart(2, '0'); // Hours in 24-hour format, padded to 2 digits (e.g., 00, 13)
    const hours12Str = String(hours12).padStart(2, '0'); // Hours in 12-hour format, padded to 2 digits (e.g., 01, 12)

    // Define month names for short and long formats
    const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; // Short month names (e.g., Jan, Feb)
    const monthNamesLong = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']; // Long month names (e.g., January, February)

    // Define format map with placeholders and their corresponding values
    const formatMap = {
        'YYYY': year, // Full year (e.g., 2024)
        'YY': String(year).slice(-2), // Last 2 digits of the year (e.g., 24)
        'MM': String(month + 1).padStart(2, '0'), // Month in 2 digits (01-12)
        'M': month + 1, // Month in 1 or 2 digits (1-12)
        'DD': day, // Day in 2 digits (e.g., 01, 15)
        'HH': hours24Str, // Hours in 24-hour format (e.g., 00, 13)
        'hh': hours12Str, // Hours in 12-hour format (e.g., 01, 12)
        'mm': minutes, // Minutes in 2 digits (e.g., 00, 45)
        'ss': seconds, // Seconds in 2 digits (e.g., 00, 59)
        'MMM': monthNamesShort[month], // Short month name (e.g., Jan, Aug)
        'MMMM': monthNamesLong[month], // Long month name (e.g., January, August)
        'A': ampm // AM/PM notation (e.g., AM, PM)
    };

    // Replace format placeholders in the format string with actual values
    let formattedDate = format;
    for (const [placeholder, value] of Object.entries(formatMap)) {
        formattedDate = formattedDate.replace(placeholder, value);
    }

    return formattedDate;
}

/**
 * Converts formatted text into plain text by removing markdown-like formatting,
 * decoding HTML entities, and normalizing whitespace.
 *
 * This function performs the following transformations:
 * 1. Decodes HTML entities to their corresponding characters.
 * 2. Removes markdown-like formatting characters such as asterisks (*) and underscores (_).
 *    - Asterisks (*) are typically used for bold text.
 *    - Underscores (_) are often used for italic text.
 * 3. Replaces newline characters with a single space to produce a single-line output.
 * 4. Trims any leading or trailing whitespace from the resulting text.
 *
 * Example:
 * Given input: "*Hello Jay Chauhan!*\n\nThis is a test email sent to verify the email sending functionality of our\napplication."
 * The function returns: "Hello Jay Chauhan! This is a test email sent to verify the email sending functionality of our application."
 *
 * @param {string} formattedText - The input text that may contain markdown-like formatting, HTML entities, and newline characters.
 * @returns {string} - The plain text representation of the input, with formatting removed, HTML entities decoded, and whitespace normalized.
 * @author Jay Chauhan
 */
const convertToPlainText = (formattedText) => {
    const { decode } = require('html-entities');
    
    // Decode HTML entities to plain text
    let text = decode(formattedText);
    
    // Remove markdown-like formatting (e.g., *bold* or _italic_)
    text = text.replace(/\*([^*]+)\*/g, '$1') // Remove asterisks for bold
               .replace(/_([^_]+)_/g, '$1'); // Remove underscores for italic
    
    // Replace newlines with spaces
    text = text.replace(/\n+/g, ' ');
  
    // Trim any extra whitespace
    text = text.trim();
  
    return text;
  }
  

module.exports = {
    getUserByToken,
    base64Encode,
    date,
    convertToPlainText
};