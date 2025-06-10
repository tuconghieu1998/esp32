import { getConnection, closeConnection } from "../db.js";

const table_config = "ws2_machine_config";
const table_data = "ws2_working_status";

export async function getListMachines() {
    let pool;
    try {
        pool = await getConnection();
        const result = await pool.request().query(`
            SELECT *
            FROM ${table_config}
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

export async function getHoursMachineWorkingByStatus(machineId, date) {
    let pool;
    try {
        pool = await getConnection();
        const result = await pool.request().query(`
WITH ordered_status AS (
    SELECT
        *,
        LEAD([timestamp]) OVER (PARTITION BY machine_id ORDER BY [timestamp]) AS next_timestamp
    FROM ws2_working_status
    WHERE CAST([timestamp] AS DATE) = '${date}' and machine_id = '${machineId}'
),
status_durations AS (
    SELECT
        machine_id,
        sensor_id,
        status,
        CAST([timestamp] AS DATE) AS log_date,
        [timestamp],
        next_timestamp,
        DATEDIFF(SECOND, [timestamp], ISNULL(next_timestamp, GETDATE())) AS duration_seconds
    FROM ordered_status
    WHERE next_timestamp IS NOT NULL
),
adjusted_status AS (
    SELECT
        machine_id,
        sensor_id,
        log_date,
        -- Nếu trạng thái là 'running' và thời gian > 30 phút ⇒ chuyển thành 'disconnected'
        CASE 
            WHEN (status = 'running' OR status = 'stopped' OR status = 'changeover') AND duration_seconds > 1800 THEN 'disconnected'
            ELSE status
        END AS status,
        duration_seconds
    FROM status_durations
)
SELECT
    log_date,
    status,
	SUM(duration_seconds) AS total_duration,
    CONVERT(varchar, DATEADD(SECOND, SUM(duration_seconds), 0), 108) AS total_duration_str
FROM adjusted_status
GROUP BY log_date, status
ORDER BY log_date, status;
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