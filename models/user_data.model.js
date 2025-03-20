import { getConnection, closeConnection } from "../db.js";

export async function getUserByUserName(username) {
    let pool;
    try {
        pool = await getConnection();
        const result = await pool.request().query(`
        SELECT * FROM account WHERE username = '${username}'
        `);

        return result.recordset || [];
    } catch (err) {
        console.error(err);
        return [];
    } finally {
        if (pool) {
            await closeConnection(); // Close connection after request
        }
    }
} 