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

// Function to get a connection pool
async function getConnection() {
    try {
        console.log(config);
        const pool = await sql.connect(config);
        return pool;
    } catch (err) {
        console.error("Database Connection Failed", err);
        throw err;
    }
}

// Function to close the pool
async function closeConnection() {
    try {
        await sql.close();
        console.log("SQL Server connection closed.");
    } catch (err) {
        console.error("Error closing connection", err);
    }
}

export {getConnection, closeConnection, sql};