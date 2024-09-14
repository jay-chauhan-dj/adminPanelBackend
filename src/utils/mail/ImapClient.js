const Imap = require('imap'); // Import the IMAP library
const { simpleParser } = require('mailparser'); // Import the simpleParser from mailparser library
const Logger = require('../logs/Logger'); // Import the Logger utility for logging

/**
 * ImapClient class handles connecting to an IMAP server and fetching unseen emails.
 * @class
 * @classdesc This class manages the connection to the IMAP server, retrieves unseen emails, and processes them.
 * @example
 * const imapConfig = {
 *     user: 'your-email@example.com',
 *     password: 'your-email-password',
 *     host: 'imap.example.com',
 *     port: 993,
 *     tls: true,
 * };
 * 
 * @property {Object} imapConfig - IMAP configuration object.
 * @property {Object} imap - IMAP instance.
 * @property {Object} logger - Logger instance for logging.
 * @property {Array} emails - Array to store fetched emails.
 * @constructor
 * @param {Object} config - IMAP configuration object.
 * @param {Object} logger - Logger instance.
 * @param {Array} emails - Array to store fetched emails.
 */
class ImapClient {
    /**
     * Constructor to initialize the IMAP client with configuration.
     * @param {Object} config - IMAP configuration object.
     */
    constructor() {
        this.imapConfig = {
            user: process.env.IMAP_USERNAME,
            password: process.env.IMAP_PASSWORD,
            host: process.env.IMAP_HOST,
            port: process.env.IMAP_PORT,
            tls: true,
        }; // Store the IMAP configuration
        this.imap = new Imap(this.imapConfig); // Create a new IMAP instance with the configuration
        this.emails = []; // Initialize an array to store fetched emails

        // Bind event handlers
        this.imap.on('ready', this.#openInbox.bind(this));
        this.imap.on('error', this.#handleError.bind(this));
        this.imap.on('end', this.#handleEnd.bind(this));
        this.logger = new Logger();
    }

    /**
     * Connect to the IMAP server.
     * @returns {Promise} - Resolves when emails are fetched.
     */
    connect() {
        return new Promise((resolve, reject) => {
            this.imap.once('ready', () => {
                this.#openInbox().then(resolve).catch(reject);
            });
            this.imap.once('error', reject);
            this.imap.connect(); // Initiate connection to the IMAP server
        });
    }

    /**
     * Open the INBOX folder.
     * @private
     * @returns {Promise} - Resolves when emails are fetched.
     */
    #openInbox() {
        return new Promise((resolve, reject) => {
            this.imap.openBox('INBOX', false, (err, box) => { // Open the INBOX folder in read-only mode
                if (err) {
                    reject(err);
                } else {
                    this.#fetchEmails().then(resolve).catch(reject); // Fetch unseen emails from the inbox
                }
            });
        });
    }

    /**
     * Fetch unseen emails from the INBOX folder.
     * @private
     * @returns {Promise} - Resolves when emails are fetched.
     */
    #fetchEmails() {
        return new Promise((resolve, reject) => {
            this.imap.search(['UNSEEN', ['SINCE', new Date()]], (err, results) => { // Search for unseen emails since the current date
                if (err) {
                    reject(err);
                } else if (results.length === 0) { // If no new emails are found
                    this.logger.write('No new emails found.', 'imap/import'); // Log no new emails found
                    this.imap.end(); // End the IMAP connection
                    resolve();
                } else {
                    const fetch = this.imap.fetch(results, { bodies: '' }); // Fetch the email bodies
                    fetch.on('message', this.#handleMessage.bind(this)); // Bind the message event handler
                    fetch.once('error', reject); // Bind the fetch error handler
                    fetch.once('end', () => { // Bind the fetch end handler
                        this.logger.write('Done fetching all messages!', 'imap/import'); // Log when done fetching messages
                        this.imap.end(); // End the IMAP connection
                        resolve();
                    });
                }
            });
        });
    }

    /**
     * Handle each email message.
     * @private
     * @param {Object} msg - The email message object.
     * @param {number} seqno - The sequence number of the message.
     */
    #handleMessage(msg, seqno) {
        let buffer = []; // Initialize buffer to store email body as chunks
        msg.on('body', (stream) => { // Bind the body event to read the email body
            stream.on('data', (chunk) => { // Bind the data event to append chunks to the buffer
                buffer.push(chunk); // Append chunk to buffer
            });
        });
        msg.once('attributes', (attrs) => { // Bind the attributes event to handle email attributes
            const { uid } = attrs; // Extract the UID of the email
            this.imap.addFlags(uid, ['\\Seen'], (err) => { // Mark the email as seen
                if (err) this.logger.write(`Error marking email ${uid} as read: ${err}`, 'imap/seen'); // Log error if marking fails
                else this.logger.write(`Marked email ${uid} as read`, 'imap/seen'); // Log success if marking succeeds
            });
        });
        msg.once('end', () => { // Bind the end event to process the email when reading is complete
            const bufferContent = Buffer.concat(buffer); // Combine all chunks into a single buffer
            simpleParser(bufferContent, (err, mail) => { // Parse the email using simpleParser
                if (err) throw err; // Throw an error if parsing fails
                // Log email details                
                this.logger.write(JSON.stringify(mail), 'imap/import');
                // Store the email in the emails array
                this.emails.push(mail);
            });
        });
    }

    /**
     * Handle IMAP connection errors.
     * @private
     * @param {Error} err - The error object.
     */
    #handleError(err) {
        this.logger.write(`IMAP Error: ${err}`, 'imap/error'); // Log the IMAP error
    }

    /**
     * Handle IMAP connection end event.
     * @private
     */
    #handleEnd() {
        this.logger.write('Connection ended', 'imap/end'); // Log when the IMAP connection ends
    }

    /**
     * Retrieve the stored emails.
     * @returns {Array} - Array of stored emails.
     */
    getEmails() {
        return this.emails;
    }
}

module.exports = ImapClient; // Export the ImapClient class
