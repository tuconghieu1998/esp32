import { getConnection, closeConnection } from "../db.js";
import sql from 'mssql';

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
    FROM ${table_data}
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

export async function getTimeLineMachineWorking(machineId, date) {
    let pool;
    try {
        pool = await getConnection();
        const result = await pool.request().query(`
WITH LastStatusBeforeDay AS (
    SELECT TOP 1 *
    FROM ws2_working_status
    WHERE machine_id = '${machineId}'
      AND timestamp < '${date} 00:00:00'
    ORDER BY timestamp DESC
),

NextStatusAfterDay AS (
    SELECT TOP 1 *
    FROM ws2_working_status
    WHERE machine_id = '${machineId}'
      AND timestamp > '${date} 23:59:59'
    ORDER BY timestamp
),

StatusesOnDay AS (
    SELECT *
    FROM ws2_working_status
    WHERE machine_id = '${machineId}'
      AND CAST(timestamp AS DATE) = '${date}'
),

CombinedWithEdges AS (
    SELECT 
        machine_id, status, CAST('${date} 00:00:00' AS DATETIME) AS timestamp
    FROM LastStatusBeforeDay

    UNION ALL

    SELECT machine_id, status, timestamp
    FROM StatusesOnDay

    UNION ALL

    SELECT 
        machine_id, status, CAST('${date} 23:59:59' AS DATETIME) AS timestamp
    FROM NextStatusAfterDay
),

StatusWithLead AS (
    SELECT *,
        LEAD(timestamp) OVER (PARTITION BY machine_id ORDER BY timestamp) AS next_timestamp
    FROM CombinedWithEdges
),

StatusWithGapHandling AS (
    SELECT *,
        DATEDIFF(SECOND, timestamp, next_timestamp) AS duration_seconds,
        CASE 
            WHEN DATEDIFF(SECOND, timestamp, next_timestamp) > 1800 THEN 'disconnected'
            ELSE status
        END AS adjusted_status
    FROM StatusWithLead
),

StatusWithGroup AS (
    SELECT *,
        ROW_NUMBER() OVER (ORDER BY timestamp) 
        - ROW_NUMBER() OVER (PARTITION BY adjusted_status ORDER BY timestamp) AS group_id
    FROM StatusWithGapHandling
),

GroupedBlocks AS (
    SELECT 
        machine_id,
        adjusted_status AS status,
        MIN(timestamp) AS start_time,
        MAX(next_timestamp) AS end_time,
        SUM(duration_seconds) AS duration_seconds
    FROM StatusWithGroup
    GROUP BY machine_id, adjusted_status, group_id
)

SELECT 
    machine_id,
    status,
    start_time,
    end_time,
    duration_seconds,
    FORMAT(duration_seconds / 60.0, 'N2') AS duration_minutes,
    FORMAT(duration_seconds / 3600.0, 'N2') AS duration_hours
FROM GroupedBlocks
WHERE start_time >= '${date} 00:00:00' AND start_time <= '${date} 23:59:59'
ORDER BY start_time;
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