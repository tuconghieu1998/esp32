import sql from "mssql";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables
let poolPromise;

// Database configuration
const config = {
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DATABASE,
    server: process.env.SERVER,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: true, // Use encryption if required
        trustServerCertificate: true, // Use this for local development
    },
};

// Function to get a connection pool
async function getConnection() {
    try {
        if (!poolPromise) {
            poolPromise = await sql.connect(config);
        }
        return poolPromise;
    } catch (err) {
        console.error("Database Connection Failed", err);
        throw err;
    }
}

// Function to close the pool
async function closeConnection() {
    try {
        if (poolPromise) {
            const pool = await poolPromise; // Ensure we have the resolved pool
            if (pool.connected) {
                await pool.close();
            }
            poolPromise = null; // Reset after closing
        }
    } catch (err) {
        console.error("Error closing connection", err);
    }
}

export { getConnection, closeConnection, sql };