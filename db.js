import sql from "mssql";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables

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

const appPool = new sql.ConnectionPool(config);

// Function to get a connection pool
async function getConnection() {
    try {
        return await appPool.connect();
    } catch (err) {
        console.error("Database Connection Failed", err);
        throw err;
    }
}

// Function to close the pool
async function closeConnection() {
    try {
        appPool.close();
    } catch (err) {
        console.error("Error closing connection", err);
    }
}

export { getConnection, closeConnection, sql };