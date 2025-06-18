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


export async function getTimeMachineRunningInMonth(machineId, date) {
    console.log("getTimeMachineRunningInMonth", machineId, date);
    let pool;
    try {
        pool = await getConnection();
        const result = await pool.request().query(`
DECLARE @machineId VARCHAR(50) = '${machineId}';
DECLARE @monthStart DATE = '${date}';
DECLARE @monthEnd DATE = EOMONTH(@monthStart);

WITH StatusWithLead AS (
    SELECT *,
        LEAD(timestamp) OVER (PARTITION BY machine_id ORDER BY timestamp) AS next_timestamp
    FROM ws2_working_status
    WHERE machine_id = @machineId
      AND timestamp >= @monthStart AND timestamp < DATEADD(DAY, 1, @monthEnd)
),

StatusExpanded AS (
    SELECT 
        machine_id,
        status,
        CAST(timestamp AS DATE) AS [date],
        timestamp AS start_time,
        CASE 
            WHEN next_timestamp IS NOT NULL AND DATEDIFF(MINUTE, timestamp, next_timestamp) <= 30 
                THEN next_timestamp
            WHEN next_timestamp IS NULL AND CAST(timestamp AS DATE) = CAST(GETDATE() AS DATE) 
                THEN GETDATE()
            ELSE DATEADD(DAY, 1, CAST(timestamp AS DATE))
        END AS end_time
    FROM StatusWithLead
),
FilteredStatus AS (
    SELECT *,
        DATEDIFF(SECOND, start_time, end_time) AS duration_seconds
    FROM StatusExpanded
    WHERE DATEDIFF(MINUTE, start_time, end_time) <= 30
),

DailySummary AS (
    SELECT 
        [date],
        SUM(CASE WHEN status = 'running' THEN duration_seconds ELSE 0 END) AS running_seconds,
        SUM(CASE WHEN status = 'changeover' THEN duration_seconds ELSE 0 END) AS changeover_seconds,
        SUM(CASE WHEN status = 'stopped' THEN duration_seconds ELSE 0 END) AS stopped_seconds
    FROM FilteredStatus
    GROUP BY [date]
),

Calendar AS (
    SELECT DATEADD(DAY, n.number, @monthStart) AS [date]
    FROM master.dbo.spt_values n
    WHERE n.type = 'P'
      AND DATEADD(DAY, n.number, @monthStart) <= @monthEnd
)

SELECT 
    c.[date],
    ISNULL(d.running_seconds, 0) / 3600.0 AS running_hours,
    ISNULL(d.changeover_seconds, 0) / 3600.0 AS changeover_hours,
    ISNULL(d.stopped_seconds, 0) / 3600.0 AS stopped_hours,
    FORMAT(ISNULL(d.running_seconds, 0) * 100.0 / (86400), 'N2') AS percent_running,
    FORMAT(ISNULL(d.changeover_seconds, 0) * 100.0 / (86400), 'N2') AS percent_changeover,
    FORMAT(ISNULL(d.stopped_seconds, 0) * 100.0 / (86400), 'N2') AS percent_stopped
FROM Calendar c
LEFT JOIN DailySummary d ON c.[date] = d.[date]
ORDER BY c.[date];
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

export async function getTimeWorkshop2RunningInMonth(date) {
    console.log("getTimeWorkshop2RunningInMonth", date);
    let pool;
    try {
        pool = await getConnection();
        const result = await pool.request().query(`
DECLARE @monthStart DATE = '${date}';
DECLARE @monthEnd DATE = EOMONTH(@monthStart);

DECLARE @machineCount INT = (
    SELECT COUNT(DISTINCT machine_id)
    FROM ws2_working_status
    WHERE timestamp >= @monthStart AND timestamp < DATEADD(DAY, 1, @monthEnd)
);

WITH StatusWithLead AS (
    SELECT *,
        LEAD(timestamp) OVER (PARTITION BY machine_id ORDER BY timestamp) AS next_timestamp
    FROM ws2_working_status
    WHERE timestamp >= @monthStart AND timestamp < DATEADD(DAY, 1, @monthEnd)
),

StatusExpanded AS (
    SELECT 
        machine_id,
        status,
        CAST(timestamp AS DATE) AS [date],
        timestamp AS start_time,
        ISNULL(next_timestamp, GETDATE()) AS end_time,
        DATEDIFF(SECOND, timestamp, ISNULL(next_timestamp, GETDATE())) AS duration_seconds
    FROM StatusWithLead
),

DailySummary AS (
    SELECT 
        [date],
        SUM(CASE WHEN status = 'running' THEN duration_seconds ELSE 0 END) AS running_seconds,
        SUM(CASE WHEN status = 'changeover' THEN duration_seconds ELSE 0 END) AS changeover_seconds,
        SUM(CASE WHEN status = 'stopped' THEN duration_seconds ELSE 0 END) AS stopped_seconds
    FROM StatusExpanded
    GROUP BY [date]
),

Calendar AS (
    SELECT DATEADD(DAY, n.number, @monthStart) AS [date]
    FROM master.dbo.spt_values n
    WHERE n.type = 'P'
      AND DATEADD(DAY, n.number, @monthStart) <= @monthEnd
)

SELECT 
    c.[date],
    ISNULL(d.running_seconds, 0) / 3600.0 AS running_hours,
    ISNULL(d.changeover_seconds, 0) / 3600.0 AS changeover_hours,
    ISNULL(d.stopped_seconds, 0) / 3600.0 AS stopped_hours,
    FORMAT(ISNULL(d.running_seconds, 0) * 100.0 / (86400 * @machineCount), 'N2') AS percent_running,
    FORMAT(ISNULL(d.changeover_seconds, 0) * 100.0 / (86400 * @machineCount), 'N2') AS percent_changeover,
    FORMAT(ISNULL(d.stopped_seconds, 0) * 100.0 / (86400 * @machineCount), 'N2') AS percent_stopped
FROM Calendar c
LEFT JOIN DailySummary d ON c.[date] = d.[date]
ORDER BY c.[date];
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

export async function getTimeWorkshop2RunningInDate(date) {
    console.log("getTimeWorkshop2RunningInDate", date);
    let pool;
    try {
        pool = await getConnection();
        const result = await pool.request().query(`
DECLARE @targetDate DATE = '${date}';
DECLARE @machineCount INT = (
    SELECT COUNT(DISTINCT machine_id)
    FROM ws2_working_status
    WHERE CAST(timestamp AS DATE) = @targetDate
);

WITH StatusWithLead AS (
    SELECT *,
        LEAD(timestamp) OVER (PARTITION BY machine_id ORDER BY timestamp) AS next_timestamp
    FROM ws2_working_status
    WHERE CAST(timestamp AS DATE) = @targetDate
),

StatusExpanded AS (
    SELECT 
        machine_id,
        status,
        CAST(timestamp AS DATE) AS [date],
        timestamp AS start_time,
        CASE 
            WHEN next_timestamp IS NOT NULL THEN next_timestamp
            WHEN @targetDate = CAST(GETDATE() AS DATE) THEN GETDATE()
            ELSE DATEADD(DAY, 1, @targetDate)
        END AS end_time,
        DATEDIFF(
            SECOND, 
            timestamp, 
            CASE 
                WHEN next_timestamp IS NOT NULL THEN next_timestamp
                WHEN @targetDate = CAST(GETDATE() AS DATE) THEN GETDATE()
                ELSE DATEADD(DAY, 1, @targetDate)
            END
        ) AS duration_seconds
    FROM StatusWithLead
),

DailyStatus AS (
    SELECT 
        [date],
        SUM(CASE WHEN status = 'running' THEN duration_seconds ELSE 0 END) AS running_seconds,
        SUM(CASE WHEN status = 'changeover' THEN duration_seconds ELSE 0 END) AS changeover_seconds,
        SUM(CASE WHEN status = 'stopped' THEN duration_seconds ELSE 0 END) AS stopped_seconds
    FROM StatusExpanded
    GROUP BY [date]
)

SELECT 
    [date],
    FORMAT(running_seconds / 3600.0, 'N2') AS running_hours,
    FORMAT(changeover_seconds / 3600.0, 'N2') AS changeover_hours,
    FORMAT(stopped_seconds / 3600.0, 'N2') AS stopped_hours,
    FORMAT(running_seconds * 100.0 / (@machineCount * 86400), 'N2') AS percent_running,
    FORMAT(changeover_seconds * 100.0 / (@machineCount * 86400), 'N2') AS percent_changeover,
    FORMAT(stopped_seconds * 100.0 / (@machineCount * 86400), 'N2') AS percent_stopped
FROM DailyStatus;
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

export async function getWorkshopReport(startDate, endDate) {
    let pool;
    try {
        pool = await getConnection();
        const result = await pool.request().query(`
DECLARE @monthStart DATE = '${startDate}';
DECLARE @monthEnd DATE = '${endDate}';

WITH StatusWithLead AS (
    SELECT *,
        LEAD(timestamp) OVER (PARTITION BY machine_id ORDER BY timestamp) AS next_timestamp
    FROM ws2_working_status
    WHERE timestamp >= @monthStart AND timestamp < DATEADD(DAY, 1, @monthEnd)
),

StatusExpanded AS (
    SELECT 
        machine_id,
        status,
        CAST(timestamp AS DATE) AS [date],
        timestamp AS start_time,
        CASE 
            WHEN next_timestamp IS NOT NULL AND DATEDIFF(MINUTE, timestamp, next_timestamp) <= 30 
                THEN next_timestamp
            WHEN next_timestamp IS NULL AND CAST(timestamp AS DATE) = CAST(GETDATE() AS DATE) 
                THEN GETDATE()
            ELSE DATEADD(DAY, 1, CAST(timestamp AS DATE))
        END AS end_time
    FROM StatusWithLead
),

FilteredStatus AS (
    SELECT *,
        DATEDIFF(SECOND, start_time, end_time) AS duration_seconds
    FROM StatusExpanded
    WHERE DATEDIFF(MINUTE, start_time, end_time) <= 30
),

DailySummary AS (
    SELECT machine_id, 
        [date],
        SUM(CASE WHEN status = 'running' THEN duration_seconds ELSE 0 END) AS running_seconds,
        SUM(CASE WHEN status = 'changeover' THEN duration_seconds ELSE 0 END) AS changeover_seconds,
        SUM(CASE WHEN status = 'stopped' THEN duration_seconds ELSE 0 END) AS stopped_seconds
    FROM FilteredStatus
    GROUP BY machine_id, [date]
)

SELECT 
    d.machine_id,
	c.line,
	d.[date],
    ISNULL(d.running_seconds, 0) / 3600.0 AS running_hours,
    ISNULL(d.changeover_seconds, 0) / 3600.0 AS changeover_hours,
    ISNULL(d.stopped_seconds, 0) / 3600.0 AS stopped_hours,
    FORMAT(ISNULL(d.running_seconds, 0) * 100.0 / (86400), 'N2') AS percent_running,
    FORMAT(ISNULL(d.changeover_seconds, 0) * 100.0 / (86400), 'N2') AS percent_changeover,
    FORMAT(ISNULL(d.stopped_seconds, 0) * 100.0 / (86400), 'N2') AS percent_stopped
FROM DailySummary d 
LEFT JOIN ws2_machine_config c ON d.machine_id = c.machine_id 
ORDER BY d.machine_id, d.[date];
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