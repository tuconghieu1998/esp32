import { getConnection, closeConnection } from "../db.js";

const table_name = "ws2_machine_config";

export async function getListMachines() {
    let pool;
    try {
        pool = await getConnection();
        const result = await pool.request().query(`
            SELECT *
            FROM ${table_name}
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