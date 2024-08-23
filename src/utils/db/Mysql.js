// Importing required modules
const mysql = require('mysql2/promise');  // Importing mysql2/promise for MySQL connection with promises
require('dotenv').config();  // Loading environment variables from a .env file

/**
 * @class MySQL
 * @description A class to handle MySQL database operations using a fluent interface.
 * @uthor Jay Chauhan
 */
class MySQL {
    /**
     * @constructor
     * Initializes the MySQL class with default values for query parts and connection.
     */
    constructor() {
        this.connection = null;  // Holds the database connection
        this.queryParts = this.#resetState();  // Initialize query parts
        this.lastQuery = '';  // Holds the last executed query
    }

    /**
     * @function #resetState
     * @description Resets the query parts to their default values.
     * @returns {Object} Default query parts
     */
    #resetState() {
        return {
            table: '',  // Table name
            joins: [],  // Join statements
            select: [],  // Select columns
            where: [],  // Where conditions
            orWhere: [],  // OR Where conditions
            groupBy: '',  // Group By statement
            orderBy: '',  // Order By statement
            limit: '',  // Limit statement
            values: []  // Values for prepared statements
        };
    }

    /**
     * @function connect
     * @description Connects to the MySQL database using credentials from environment variables.
     * @returns {Promise<void>}
     */
    async connect() {
        this.connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
        });
    }

    /**
     * @function disconnect
     * @description Disconnects from the MySQL database.
     * @returns {Promise<void>}
     */
    async disconnect() {
        if (this.connection) {
            await this.connection.end();
        }
    }

    /**
     * @function table
     * @description Sets the table name for the query.
     * @param {string} tableName - The name of the table.
     * @returns {MySQL}
     */
    table(tableName) {
        this.queryParts.table = tableName;
        return this;
    }

    /**
     * @function join
     * @description Adds a JOIN clause to the query.
     * @param {string} table - The table to join.
     * @param {string} condition - The join condition.
     * @returns {MySQL}
     */
    join(table, condition) {
        this.queryParts.joins.push(`JOIN ${table} ON ${condition}`);
        return this;
    }

    /**
     * @function select
     * @description Sets the columns to select in the query.
     * @param {...string} columns - The columns to select.
     * @returns {MySQL}
     */
    select(...columns) {
        this.queryParts.select = columns;
        return this;
    }

    /**
     * @function rawWhere
     * @description Adds a WHERE condition to the query.
     * @param {string} rawWhere - raw query.
     * @returns {MySQL}
     */
    rawWhere(rawWhere) {
        this.queryParts.where.push(`${rawWhere}`);
        return this;
    }

    /**
     * @function where
     * @description Adds a WHERE condition to the query.
     * @param {string} column - The column for the condition.
     * @param {*} value - The value for the condition.
     * @param {string} [operator='='] - The operator for the condition.
     * @returns {MySQL}
     */
    where(column, value, operator = '=') {
        this.queryParts.where.push(`${column} ${operator} ?`);
        this.queryParts.values.push(value);
        return this;
    }

    /**
     * @function orWhere
     * @description Adds an OR WHERE condition to the query.
     * @param {string} column - The column for the condition.
     * @param {*} value - The value for the condition.
     * @param {string} [operator='='] - The operator for the condition.
     * @returns {MySQL}
     */
    orWhere(column, value, operator = '=') {
        this.queryParts.orWhere.push(`${column} ${operator} ?`);
        this.queryParts.values.push(value);
        return this;
    }

    /**
     * @function groupBy
     * @description Adds a GROUP BY clause to the query.
     * @param {string} column - The column to group by.
     * @returns {MySQL}
     */
    groupBy(column) {
        this.queryParts.groupBy = `GROUP BY ${column}`;
        return this;
    }

    /**
     * @function orderBy
     * @description Adds an ORDER BY clause to the query.
     * @param {string} column - The column to order by.
     * @param {string} order - The order direction (ASC or DESC).
     * @returns {MySQL}
     */
    orderBy(column, order) {
        this.queryParts.orderBy = `ORDER BY ${column} ${order}`;
        return this;
    }

    /**
     * @function limit
     * @description Adds a LIMIT clause to the query.
     * @param {number} limit - The number of rows to limit.
     * @returns {MySQL}
     */
    limit(limit) {
        this.queryParts.limit = `LIMIT ${limit}`;
        return this;
    }

    /**
     * @function #execute
     * @description Executes the given query with provided values and resets the query parts.
     * @private
     * @param {string} query - The SQL query to execute.
     * @param {Array} values - The values for the prepared statement.
     * @returns {Promise<Array>}
     */
    async #execute(query, values) {
        if (!this.connection) {
            throw new Error('Database connection is not established. Call connect() first.');
        }

        try {
            this.lastQuery = query;  // Store the last query
            const [rows] = await this.connection.execute(query, values);
            this.queryParts = this.#resetState();  // Reset the query parts after execution
            return rows;
        } catch (error) {
            console.error('Error executing query:', error);
            throw error; // Rethrow the error after logging it
        }
    }

    /**
     * @function get
     * @description Builds and executes a SELECT query based on the accumulated query parts.
     * @returns {Promise<Array>}
     */
    async get() {
        let query = `SELECT ${this.queryParts.select.join(', ')} FROM ${this.queryParts.table}`;
        if (this.queryParts.joins.length) query += ` ${this.queryParts.joins.join(' ')}`;
        if (this.queryParts.where.length) query += ` WHERE ${this.queryParts.where.join(' AND ')}`;
        if (this.queryParts.orWhere.length) query += ` OR ${this.queryParts.orWhere.join(' OR ')}`;
        if (this.queryParts.groupBy) query += ` ${this.queryParts.groupBy}`;
        if (this.queryParts.orderBy) query += ` ${this.queryParts.orderBy}`;
        if (this.queryParts.limit) query += ` ${this.queryParts.limit}`;

        return await this.#execute(query, this.queryParts.values);
    }

    /**
     * @function first
     * @description Builds and executes a SELECT query based on the accumulated query parts and returns the first row.
     * @returns {Promise<Object>}
     */
    async first() {
        return (await this.limit(1).get())[0];
    }

    /**
     * @function insert
     * @description Builds and executes an INSERT query with the given data.
     * @param {Object} data - The data to insert.
     * @returns {Promise<number>}
     */
    async insert(data) {
        const columns = Object.keys(data).join(', ');
        const placeholders = Object.keys(data).map(() => '?').join(', ');
        const values = Object.values(data);

        const query = `INSERT INTO ${this.queryParts.table} (${columns}) VALUES (${placeholders})`;

        const result = await this.#execute(query, values);
        return result.insertId;
    }

    /**
     * @function update
     * @description Builds and executes an UPDATE query with the given data.
     * @param {Object} data - The data to update.
     * @returns {Promise<boolean>}
     */
    async update(data) {
        const set = Object.keys(data).map(key => `${key} = ?`).join(', ');
        const values = [...Object.values(data), ...this.queryParts.values];

        let query = `UPDATE ${this.queryParts.table} SET ${set}`;
        if (this.queryParts.where.length) query += ` WHERE ${this.queryParts.where.join(' AND ')}`;
        if (this.queryParts.orWhere.length) query += ` OR ${this.queryParts.orWhere.join(' OR ')}`;

        const result = await this.#execute(query, values);
        return result.affectedRows > 0;
    }

    /**
     * @function startTransaction
     * @description Begins a new transaction.
     * @returns {Promise<void>}
     */
    async startTransaction() {
        await this.connection.beginTransaction();
    }

    /**
     * @function commit
     * @description Commits the current transaction.
     * @returns {Promise<void>}
     */
    async commit() {
        await this.connection.commit();
    }

    /**
     * @function rollback
     * @description Rolls back the current transaction.
     * @returns {Promise<void>}
     */
    async rollback() {
        await this.connection.rollback();
    }

    /**
     * @function getLastQuery
     * @description Returns the last executed query.
     * @returns {string} The last executed query.
     */
    getLastQuery() {
        return this.lastQuery;
    }
}

module.exports = MySQL;
