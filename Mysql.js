// Importing required modules
const mysql = require('mysql2/promise');  // Import mysql2's promise-based API for async DB operations
require('dotenv').config();  // Load environment variables from a .env file into process.env

/**
 * @class MySQL
 * @description A class to handle MySQL database operations using a fluent interface.
 * @author Jay Chauhan
 */
class MySQL {  // Define the MySQL class used to build and run parameterized queries
    /**
     * @constructor
     * @param {string} db_host - Database host (defaults to process.env.DB_HOST)
     * @param {number} db_port - Database port (defaults to process.env.DB_PORT)
     * @param {string} db_user - Database user (defaults to process.env.DB_USER)
     * @param {string} db_password - Database password (defaults to process.env.DB_PASS)
     * @param {string} db_name - Database name (defaults to process.env.DB_NAME)
     * Initializes the MySQL class with default values for query parts and connection.
     */
    constructor(db_host = null, db_port = null, db_user = null, db_password = null, db_name = null) {
        this.connection = null;  // Holds the database connection
        this.queryParts = this.#resetState();  // Initialize query parts
        this.lastQuery = '';  // Holds the last executed query
        this.db_host = db_host || process.env.DB_HOST;
        this.db_port = db_port || process.env.DB_PORT;
        this.db_user = db_user || process.env.DB_USER;
        this.db_password = db_password || process.env.DB_PASS;
        this.db_name = db_name || process.env.DB_NAME;
    }

    /**
     * @function #resetState
     * @description Resets the query parts to their default values.
     * @returns {Object} Default query parts
     */
    #resetState() {  // Private helper to return the default query-parts object structure
        return {
            table: '',  // Table name for the next query (string)
            joins: [],  // Accumulated JOIN clauses (array of strings)
            select: [],  // Columns to select (array of strings)
            where: [],  // WHERE conditions joined with AND (array of strings)
            orWhere: [],  // OR WHERE conditions (array of strings)
            groupBy: '',  // GROUP BY clause text (string)
            orderBy: '',  // ORDER BY clause text (string)
            limit: '',  // LIMIT clause text (string)
            values: []  // Parameter values for prepared statements (array of values)
        };
    }

    /**
     * @function connect
     * @description Connects to the MySQL database using credentials from constructor or environment variables.
     * @param {boolean} multipleStatements - Enable multiple statements execution (default: false)
     * @returns {Promise<void>}
     */
    async connect(multipleStatements = false) {
        this.connection = await mysql.createConnection({
            host: this.db_host,
            port: this.db_port,
            user: this.db_user,
            password: this.db_password,
            database: this.db_name,
            multipleStatements
        });
    }

    /**
     * @function disconnect
     * @description Disconnects from the MySQL database.
     * @returns {Promise<void>}
     */
    async disconnect() {  // Close the active MySQL connection if it exists
        if (this.connection) {  // Only attempt to end when a connection is present
            await this.connection.end();  // Gracefully close the connection
        }
    }

    /**
     * @function table
     * @description Sets the table name for the query.
     * @param {string} tableName - The name of the table.
     * @returns {MySQL}
     */
    table(tableName) {  // Set target table name for subsequent query builder calls
        this.queryParts.table = tableName;  // Assign provided table name into queryParts
        return this;  // Return this for fluent chaining
    }

    /**
     * @function join
     * @description Adds a JOIN clause to the query.
     * @param {string} table - The table to join.
     * @param {string} condition - The join condition.
     * @returns {MySQL}
     */
    join(table, condition, type = null) {  // Append a JOIN clause; supports optional join type (e.g., LEFT)
        if (type) {  // If a join type was provided, include it in the clause
            this.queryParts.joins.push(`${type} JOIN ${table} ON ${condition}`);  // Add typed JOIN string
            return this;  // Return instance for chaining
        }
        this.queryParts.joins.push(`JOIN ${table} ON ${condition}`);  // Add default JOIN string if no type
        return this;  // Return instance for chaining
    }

    /**
     * @function select
     * @description Sets the columns to select in the query.
     * @param {...string} columns - The columns to select.
     * @returns {MySQL}
     */
    select(...columns) {  // Store the list of columns to include in SELECT clause
        this.queryParts.select = columns;  // Overwrite select array with provided columns
        return this;  // Return instance to allow method chaining
    }

    /**
     * @function rawWhere
     * @description Adds a WHERE condition to the query.
     * @param {string} rawWhere - raw query.
     * @returns {MySQL}
     */
    rawWhere(rawWhere) {  // Add a raw WHERE condition string (use with caution to avoid injections)
        this.queryParts.where.push(`${rawWhere}`);  // Push the raw condition into where array
        return this;  // Return instance for chaining
    }

    /**
     * @function where
     * @description Adds a WHERE condition to the query.
     * @param {string} column - The column for the condition.
     * @param {*} value - The value for the condition.
     * @param {string} [operator='='] - The operator for the condition.
     * @returns {MySQL}
     */
    where(column, value, operator = '=') {  // Add a parameterized WHERE expression and append its value
        this.queryParts.where.push(`${column} ${operator} ?`);  // Push parameter placeholder expression
        this.queryParts.values.push(value);  // Store the corresponding parameter value for execution
        return this;  // Return instance to support chaining
    }

    /**
     * @function orWhere
     * @description Adds an OR WHERE condition to the query.
     * @param {string} column - The column for the condition.
     * @param {*} value - The value for the condition.
     * @param {string} [operator='='] - The operator for the condition.
     * @returns {MySQL}
     */
    orWhere(column, value, operator = '=') {  // Add an OR condition using parameterized placeholder
        this.queryParts.orWhere.push(`${column} ${operator} ?`);  // Append OR condition expression
        this.queryParts.values.push(value);  // Append the value to the parameters array
        return this;  // Return instance for chaining
    }

    /**
     * @function whereIn
     * @description Adds a WHERE IN condition to the query.
     * @param {string} column - The column for the condition.
     * @param {Array} values - The array of values for the IN clause.
     * @returns {MySQL}
     */
    whereIn(column, values) {  // Add a parameterized WHERE ... IN (...) clause with multiple placeholders
        if (!Array.isArray(values) || values.length === 0) {  // Validate input is a non-empty array
            return this;  // No-op and return instance if values is invalid or empty
        }
        const placeholders = values.map(() => '?').join(', ');  // Create comma-separated placeholders
        this.queryParts.where.push(`${column} IN (${placeholders})`);  // Add the IN clause to where array
        this.queryParts.values.push(...values);  // Spread provided values into the parameters array
        return this;  // Return instance for chaining
    }

    /**
     * @function groupBy
     * @description Adds a GROUP BY clause to the query.
     * @param {string} column - The column to group by.
     * @returns {MySQL}
     */
    groupBy(column) {  // Set the GROUP BY clause text using the supplied column
        this.queryParts.groupBy = `GROUP BY ${column}`;  // Assign GROUP BY clause to queryParts
        return this;  // Return instance for chaining
    }

    /**
     * @function orderBy
     * @description Adds an ORDER BY clause to the query.
     * @param {string} column - The column to order by.
     * @param {string} order - The order direction (ASC or DESC).
     * @returns {MySQL}
     */
    orderBy(column, order) {  // Set the ORDER BY clause with column and direction
        this.queryParts.orderBy = `ORDER BY ${column} ${order}`;  // Assign ORDER BY clause to queryParts
        return this;  // Return instance for chaining
    }

    /**
     * @function limit
     * @description Adds a LIMIT clause to the query.
     * @param {number} limit - The number of rows to limit.
     * @returns {MySQL}
     */
    limit(limit) {  // Set the LIMIT clause for result size control
        this.queryParts.limit = `LIMIT ${limit}`;  // Assign LIMIT clause string to queryParts
        return this;  // Return instance for chaining
    }

    /**
     * @function #execute
     * @description Executes the given query with provided values and resets the query parts.
     * @private
     * @param {string} query - The SQL query to execute.
     * @param {Array} values - The values for the prepared statement.
     * @returns {Promise<Array>}
     */
    async #execute(query, values) {  // Private method responsible for executing SQL via the connection
        if (!this.connection) {  // Guard clause: ensure a DB connection exists before executing
            throw new Error('Database connection is not established. Call connect() first.');  // Throw clear error for callers
        }

        try {  // Attempt query execution and state reset
            this.lastQuery = query;  // Persist the executed query string for diagnostics
            const [rows] = await this.connection.execute(query, values);  // Execute parameterized query and destructure result rows
            this.queryParts = this.#resetState();  // Reset queryParts to defaults after successful execution
            return rows;  // Return fetched rows to the caller
        } catch (error) {  // Catch and handle execution errors
            console.error('Error executing query:', error);  // Log error to console for server-side visibility
            throw error; // Re-throw the error so the caller can handle it appropriately
        }
    }

    /**
     * @function get
     * @description Builds and executes a SELECT query based on the accumulated query parts.
     * @returns {Promise<Array>}
     */
    async get() {  // Compose a SELECT statement from queryParts and execute it
        let query = `SELECT ${this.queryParts.select.join(', ')} FROM ${this.queryParts.table}`;  // Build base SELECT ... FROM clause
        if (this.queryParts.joins.length) query += ` ${this.queryParts.joins.join(' ')}`;  // Append JOINs if any exist
        if (this.queryParts.where.length) query += ` WHERE ${this.queryParts.where.join(' AND ')}`;  // Append WHERE clause with AND-combined conditions
        if (this.queryParts.orWhere.length) query += ` OR ${this.queryParts.orWhere.join(' OR ')}`;  // Append OR conditions if present
        if (this.queryParts.groupBy) query += ` ${this.queryParts.groupBy}`;  // Append GROUP BY if specified
        if (this.queryParts.orderBy) query += ` ${this.queryParts.orderBy}`;  // Append ORDER BY if specified
        if (this.queryParts.limit) query += ` ${this.queryParts.limit}`;  // Append LIMIT if specified

        return await this.#execute(query, this.queryParts.values);  // Execute assembled query with parameters and return rows
    }

    /**
     * @function first
     * @description Builds and executes a SELECT query based on the accumulated query parts and returns the first row.
     * @returns {Promise<Object>}
     */
    async first() {  // Retrieve only the first result row for the current queryParts
        return (await this.limit(1).get())[0];  // Apply LIMIT 1, run get(), then return the first element of the result array
    }

    /**
     * @function insert
     * @description Builds and executes an INSERT query with the given data.
     * @param {Object} data - The data to insert.
     * @returns {Promise<number>}
     */
    async insert(data) {  // Build parameterized INSERT statement from provided data object and execute it
        const columns = Object.keys(data).join(', ');  // Derive comma-separated column list from object keys
        const placeholders = Object.keys(data).map(() => '?').join(', ');  // Create matching '?' placeholders for each value
        const values = Object.values(data);  // Extract an array of values for parameter binding

        const query = `INSERT INTO ${this.queryParts.table} (${columns}) VALUES (${placeholders})`;  // Assemble the INSERT SQL string

        const result = await this.#execute(query, values);  // Execute the INSERT with parameter values
        return result.insertId;  // Return the generated insertId (auto-increment primary key) to the caller
    }

    /**
     * @function update
     * @description Builds and executes an UPDATE query with the given data.
     * @param {Object} data - The data to update.
     * @returns {Promise<boolean>}
     */
    async update(data) {  // Build parameterized UPDATE statement and execute it against rows matched by where/orWhere
        const set = Object.keys(data).map(key => `${key} = ?`).join(', ');  // Build SET clause with placeholders
        const values = [...Object.values(data), ...this.queryParts.values];  // Combine update values with existing where/orWhere parameter values

        let query = `UPDATE ${this.queryParts.table} SET ${set}`;  // Start forming the UPDATE SQL string
        if (this.queryParts.where.length) query += ` WHERE ${this.queryParts.where.join(' AND ')}`;  // Append WHERE conditions if provided
        if (this.queryParts.orWhere.length) query += ` OR ${this.queryParts.orWhere.join(' OR ')}`;  // Append OR conditions if provided

        const result = await this.#execute(query, values);  // Execute the UPDATE statement with combined parameter values
        return result.affectedRows > 0;  // Return true if any rows were affected (indicates success)
    }

    /**
     * @function delete
     * @description Builds and executes a DELETE query.
     * @returns {Promise<boolean>}
     */
    async delete() {  // Build and execute a DELETE statement for the configured table and conditions
        let query = `DELETE FROM ${this.queryParts.table}`;  // Base DELETE FROM clause
        if (this.queryParts.where.length) query += ` WHERE ${this.queryParts.where.join(' AND ')}`;  // Append WHERE clause if present
        if (this.queryParts.orWhere.length) query += ` OR ${this.queryParts.orWhere.join(' OR ')}`;  // Append OR conditions if present

        const result = await this.#execute(query, this.queryParts.values);  // Execute the DELETE and return the DB result
        return result.affectedRows > 0;  // Return true when at least one row was deleted
    }

    /**
     * @function startTransaction
     * @description Begins a new transaction.
     * @returns {Promise<void>}
     */
    async startTransaction() {  // Begin a database transaction on the active connection
        await this.connection.beginTransaction();  // Use connection's beginTransaction method
    }

    /**
     * @function commit
     * @description Commits the current transaction.
     * @returns {Promise<void>}
     */
    async commit() {  // Commit the currently open transaction to persist changes
        await this.connection.commit();  // Call commit on the connection
    }

    /**
     * @function rollback
     * @description Rolls back the current transaction.
     * @returns {Promise<void>}
     */
    async rollback() {  // Roll back the current transaction to revert changes
        await this.connection.rollback();  // Call rollback on the connection
    }

    /**
     * @function getLastQuery
     * @description Returns the last executed query.
     * @returns {string} The last executed query.
     */
    getLastQuery() {  // Accessor returning the last executed SQL string for debugging or logging
        return this.lastQuery;  // Return the stored lastQuery value
    }

    /**
     * @function createDatabase
     * @description Creates a new database with specified charset and collation
     * @param {string} dbName - The name of the database to create
     * @param {string} charset - Character set (default: utf8mb4)
     * @param {string} collation - Collation (default: utf8mb4_unicode_ci)
     * @returns {Promise<boolean>}
     */
    async createDatabase(dbName, charset = 'utf8mb4', collation = 'utf8mb4_unicode_ci') {
        if (!this.connection) {
            throw new Error('Database connection is not established. Call connect() first.');
        }

        const query = `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET ${charset} COLLATE ${collation}`;
        
        try {
            await this.connection.execute(query);
            return true;
        } catch (error) {
            console.error('Error creating database:', error);
            throw error;
        }
    }

    /**
     * @function executeRawQuery
     * @description Executes a raw SQL query (use for schema files or complex queries)
     * @param {string} sql - The raw SQL query to execute
     * @returns {Promise<any>}
     */
    async executeRawQuery(sql) {
        if (!this.connection) {
            throw new Error('Database connection is not established. Call connect() first.');
        }

        try {
            const [result] = await this.connection.query(sql);
            return result;
        } catch (error) {
            console.error('Error executing raw query:', error);
            throw error;
        }
    }

    /**
     * @function createTableFromJson
     * @description Creates a table from JSON schema definition
     * @param {string} tableName - The name of the table to create
     * @param {Object} schema - JSON schema defining columns and constraints
     * @returns {Promise<boolean>}
     */
    async createTableFromJson(tableName, schema) {
        if (!this.connection) {
            throw new Error('Database connection is not established. Call connect() first.');
        }

        const columns = [];
        for (const [columnName, definition] of Object.entries(schema)) {
            let columnDef = `\`${columnName}\` ${definition.type}`;
            if (definition.length) columnDef += `(${definition.length})`;
            if (definition.notNull) columnDef += ' NOT NULL';
            if (definition.autoIncrement) columnDef += ' AUTO_INCREMENT';
            if (definition.primaryKey) columnDef += ' PRIMARY KEY';
            if (definition.unique) columnDef += ' UNIQUE';
            if (definition.default !== undefined) columnDef += ` DEFAULT ${definition.default}`;
            columns.push(columnDef);
        }

        const query = `CREATE TABLE IF NOT EXISTS \`${tableName}\` (${columns.join(', ')})`;
        
        try {
            await this.connection.execute(query);
            return true;
        } catch (error) {
            console.error('Error creating table:', error);
            throw error;
        }
    }
}

module.exports = MySQL;  // Export the MySQL class as a CommonJS module for external usage
