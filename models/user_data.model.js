import { getConnection } from "../db.js";

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
    }
} 