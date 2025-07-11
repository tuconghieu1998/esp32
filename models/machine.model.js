import { getConnection } from "../db.js";

const table_config = "ws2_machine_config";
const table_data = "ws2_working_status";

export async function getListMachines() {
    let pool;
    try {
        pool = await getConnection();
        const result = await pool.request().query(`
            SELECT *
            FROM ${table_config}
            ORDER BY sensor_id ASC
        `);

        return result.recordset || [];
    } catch (err) {
        console.error(err);
        return [];
    }
}

export async function getConfigBySensorId(sensorId) {
    let pool;
    try {
        pool = await getConnection();
        const result = await pool.request().query(`
            SELECT *
            FROM ${table_config}
            where sensor_id = '${sensorId}'
        `);

        return result.recordset || [];
    } catch (err) {
        console.error(err);
        return [];
    }
}

export async function getConfigByMachineId(machineId) {
    let pool;
    try {
        pool = await getConnection();
        const result = await pool.request().query(`
            SELECT *
            FROM ${table_config}
            where machine_id = '${machineId}'
        `);

        return result.recordset || [];
    } catch (err) {
        console.error(err);
        return [];
    }
}

export async function createSensorConfig(config) {
    let pool;
    try {
        pool = await getConnection();

        const result = await pool.request()
            .input('sensor_id', config.sensor_id)
            .input('machine_id', config.machine_id)
            .input('line', config.line)
            .input('note', config.note || '')
            .query(`
                INSERT INTO ${table_config} (sensor_id, machine_id, line, note)
                VALUES (@sensor_id, @machine_id, @line, @note)
            `);

        return result.rowsAffected[0] > 0;
    } catch (err) {
        console.error('Error creating machine config:', err);
        return false;
    }
}

export async function getLastSensorIdInConfig() {
    try {
        const pool = await getConnection();
        const result = await pool.request().query(`
            SELECT TOP 1 sensor_id
            FROM ${table_config}
            ORDER BY id DESC
        `);
        const lastId = result.recordset[0]?.sensor_id || "PZEM0000";
        return lastId;
    } catch (err) {
        console.error(err);
        return [];
    }
}

export async function editSensorConfig(config) {
    try {
        const {
            id, sensor_id, machine_id, line, note 
        } = config;
        const pool = await getConnection();
        await pool.request()
            .input('id', id)
            .input('sensor_id', sensor_id)
            .input('machine_id', machine_id)
            .input('line', line)
            .input('note', note)
            .query(`
                UPDATE ${table_config}
                SET sensor_id = @sensor_id, machine_id = @machine_id, line = @line, note = @note
                WHERE id = @id
            `);

        return true;
    } catch (err) {
        console.error('Error creating machine config:', err);
        return false;
    }
}

export async function deleteSensorConfig(id) {
    try {
        const pool = await getConnection();
        await pool.request()
            .input('id', id)
            .query(`DELETE FROM ${table_config} WHERE id = @id`);
        return true;
    } catch (err) {
        console.error('Error creating machine config:', err);
        return false;
    }
}

export async function getHoursMachineWorkingByStatus(machineId, date) {
    let pool;
    try {
        pool = await getConnection();
        const result = await pool.request().query(`
DECLARE @machineId VARCHAR(50) = '${machineId}';
DECLARE @date DATE = '${date}';

;WITH StatusWithLead AS (
    SELECT *,
        LEAD(timestamp) OVER (PARTITION BY machine_id ORDER BY timestamp) AS next_timestamp
    FROM ws2_working_status
    WHERE machine_id = @machineId
      AND timestamp >= @date 
      AND timestamp < DATEADD(DAY, 2, @date)
),

StatusExpanded AS (
    SELECT 
        machine_id,
        status,
        CAST(timestamp AS DATE) AS [date],
        timestamp AS start_time,
        CASE 
            WHEN next_timestamp IS NOT NULL AND DATEDIFF(MINUTE, timestamp, next_timestamp) <= 60 
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
    WHERE DATEDIFF(MINUTE, start_time, end_time) <= 60 AND CAST(start_time AS DATE) = @date
),

DailyCalculated AS (
    SELECT 
        [date],
        machine_id,
        SUM(CASE WHEN status = 'running' THEN duration_seconds ELSE 0 END) / 3600.0 AS calc_running_hours,
        SUM(CASE WHEN status = 'changeover' THEN duration_seconds ELSE 0 END) / 3600.0 AS calc_changeover_hours,
        SUM(CASE WHEN status = 'stopped' THEN duration_seconds ELSE 0 END) / 3600.0 AS calc_stopped_hours
    FROM FilteredStatus
    GROUP BY machine_id, [date]
)

SELECT
    COALESCE(d.[date], wd.[date]) AS [date],
    COALESCE(d.machine_id, wd.machine_id) AS machine_id,

    ROUND(ISNULL(d.calc_running_hours, wd.running_hours), 2) AS running_hours,
    ROUND(ISNULL(d.calc_stopped_hours, wd.stopped_hours), 2) AS stopped_hours,
    ROUND(ISNULL(d.calc_changeover_hours, wd.changeover_hours), 2) AS changeover_hours

FROM DailyCalculated d
FULL OUTER JOIN ws2_working_date wd
    ON wd.machine_id = d.machine_id AND wd.[date] = d.[date]
WHERE 
    COALESCE(d.machine_id, wd.machine_id) = @machineId
    AND COALESCE(d.[date], wd.[date]) = @date;
        `);

        return result.recordset || [];
    } catch (err) {
        console.error(err);
        return [];
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
            WHEN DATEDIFF(SECOND, timestamp, next_timestamp) > 3600 THEN 'disconnected'
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
    }
}


export async function getTimeMachineRunningInMonth(machineId, date) {
    let pool;
    try {
        pool = await getConnection();
        const result = await pool.request().query(`
DECLARE @machineId VARCHAR(50) = '${machineId}';
DECLARE @monthStart DATE = '${date}';
DECLARE @monthEnd DATE = EOMONTH(@monthStart);

;WITH StatusWithLead AS (
    SELECT *,
        LEAD(timestamp) OVER (PARTITION BY machine_id ORDER BY timestamp) AS next_timestamp
    FROM ws2_working_status
    WHERE machine_id = @machineId
      AND timestamp >= @monthStart 
      AND timestamp < DATEADD(DAY, 1, @monthEnd)
),

StatusExpanded AS (
    SELECT 
        machine_id,
        status,
        CAST(timestamp AS DATE) AS [date],
        timestamp AS start_time,
        CASE 
            WHEN next_timestamp IS NOT NULL AND DATEDIFF(MINUTE, timestamp, next_timestamp) <= 60 
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
    WHERE DATEDIFF(MINUTE, start_time, end_time) <= 60
),

DailyCalculated AS (
    SELECT 
        [date],
        machine_id,
        SUM(CASE WHEN status = 'running' THEN duration_seconds ELSE 0 END) / 3600.0 AS running_hours,
        SUM(CASE WHEN status = 'changeover' THEN duration_seconds ELSE 0 END) / 3600.0 AS changeover_hours,
        SUM(CASE WHEN status = 'stopped' THEN duration_seconds ELSE 0 END) / 3600.0 AS stopped_hours
    FROM FilteredStatus
    GROUP BY machine_id, [date]
),

Calendar AS (
    SELECT DATEADD(DAY, number, @monthStart) AS [date]
    FROM master.dbo.spt_values
    WHERE type = 'P'
      AND DATEADD(DAY, number, @monthStart) <= @monthEnd
)

SELECT 
    c.[date],
    @machineId AS machine_id,

    ROUND(ISNULL(dc.running_hours, wd.running_hours), 2) AS running_hours,
    ROUND(ISNULL(dc.changeover_hours, wd.changeover_hours), 2) AS changeover_hours,
    ROUND(ISNULL(dc.stopped_hours, wd.stopped_hours), 2) AS stopped_hours,

    CAST(ISNULL(dc.running_hours, wd.running_hours) * 100.0 / 24 AS DECIMAL(5,2)) AS percent_running,
    CAST(ISNULL(dc.changeover_hours, wd.changeover_hours) * 100.0 / 24 AS DECIMAL(5,2)) AS percent_changeover,
    CAST(ISNULL(dc.stopped_hours, wd.stopped_hours) * 100.0 / 24 AS DECIMAL(5,2)) AS percent_stopped

FROM Calendar c
LEFT JOIN DailyCalculated dc ON dc.[date] = c.[date] AND dc.machine_id = @machineId
LEFT JOIN ws2_working_date wd ON wd.[date] = c.[date] AND wd.machine_id = @machineId
ORDER BY c.[date];
        `);
        return result.recordset || [];
    } catch (err) {
        console.error(err);
        return [];
    }
}

export async function getTimeWorkshop2RunningInMonth(date) {
    let pool;
    try {
        pool = await getConnection();
        const result = await pool.request().query(`
DECLARE @monthStart DATE = '${date}';
DECLARE @monthEnd DATE = EOMONTH(@monthStart);

;WITH StatusWithLead AS (
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
            WHEN next_timestamp IS NOT NULL AND DATEDIFF(MINUTE, timestamp, next_timestamp) <= 60 THEN next_timestamp
            WHEN next_timestamp IS NULL AND CAST(timestamp AS DATE) = CAST(GETDATE() AS DATE) THEN GETDATE()
            ELSE DATEADD(DAY, 1, CAST(timestamp AS DATE))
        END AS end_time
    FROM StatusWithLead
),

FilteredStatus AS (
    SELECT *,
        DATEDIFF(SECOND, start_time, end_time) AS duration_seconds
    FROM StatusExpanded
    WHERE DATEDIFF(MINUTE, start_time, end_time) <= 60
),

DailyCalculated AS (
    SELECT 
        [date],
        count(DISTINCT  machine_id) as machine_count,
        SUM(CASE WHEN status = 'running' THEN duration_seconds ELSE 0 END) / 3600.0 AS running_hours,
        SUM(CASE WHEN status = 'changeover' THEN duration_seconds ELSE 0 END) / 3600.0 AS changeover_hours,
        SUM(CASE WHEN status = 'stopped' THEN duration_seconds ELSE 0 END) / 3600.0 AS stopped_hours
    FROM FilteredStatus
    GROUP BY [date]
),

StoredSummary AS (
    SELECT 
        [date],
        count(DISTINCT  machine_id) as machine_count,
        SUM(running_hours) AS running_hours,
        SUM(changeover_hours) AS changeover_hours,
        SUM(stopped_hours) AS stopped_hours
    FROM ws2_working_date
    WHERE [date] BETWEEN @monthStart AND @monthEnd
    GROUP BY date
)

SELECT 
    COALESCE(c.date, w.date) AS [date],

    ROUND(ISNULL(c.running_hours, w.running_hours), 2) AS running_hours,
    ROUND(ISNULL(c.changeover_hours, w.changeover_hours), 2) AS changeover_hours,
    ROUND(ISNULL(c.stopped_hours, w.stopped_hours), 2) AS stopped_hours,

    CAST(ISNULL(c.running_hours, w.running_hours) * 100.0 / (24 * ISNULL(c.machine_count, w.machine_count))  AS DECIMAL(5,2)) AS percent_running,
    CAST(ISNULL(c.changeover_hours, w.changeover_hours) * 100.0 / (24 * ISNULL(c.machine_count, w.machine_count)) AS DECIMAL(5,2)) AS percent_changeover,
    CAST(ISNULL(c.stopped_hours, w.stopped_hours) * 100.0 / (24 * ISNULL(c.machine_count, w.machine_count)) AS DECIMAL(5,2)) AS percent_stopped

FROM DailyCalculated c
FULL OUTER JOIN StoredSummary w
    ON c.date = w.date
WHERE COALESCE(c.date, w.date) BETWEEN @monthStart AND @monthEnd
        `);
        return result.recordset || [];
    } catch (err) {
        console.error(err);
        return [];
    }
}

export async function getTimeWorkshop2RunningInDate(date) {
    let pool;
    try {
        pool = await getConnection();
        const result = await pool.request().query(`
DECLARE @targetDate DATE = '${date}';

;WITH StatusWithLead AS (
    SELECT *,
        LEAD(timestamp) OVER (PARTITION BY machine_id ORDER BY timestamp) AS next_timestamp
    FROM ws2_working_status
    WHERE timestamp >= @targetDate 
      AND timestamp < DATEADD(DAY, 2, @targetDate)
),

StatusExpanded AS (
    SELECT 
        machine_id,
        status,
        CAST(timestamp AS DATE) AS [date],
        timestamp AS start_time,
        CASE 
            WHEN next_timestamp IS NOT NULL AND DATEDIFF(MINUTE, timestamp, next_timestamp) <= 60 THEN next_timestamp
            WHEN next_timestamp IS NULL AND CAST(timestamp AS DATE) = CAST(GETDATE() AS DATE) THEN GETDATE()
            ELSE DATEADD(DAY, 1, CAST(timestamp AS DATE))
        END AS end_time
    FROM StatusWithLead
),

FilteredStatus AS (
    SELECT *,
        DATEDIFF(SECOND, start_time, end_time) AS duration_seconds
    FROM StatusExpanded
    WHERE DATEDIFF(MINUTE, start_time, end_time) <= 60 AND CAST(start_time AS DATE) = @targetDate
),

DailyCalculated AS (
    SELECT 
        [date],
        count(DISTINCT  machine_id) as machine_count,
        SUM(CASE WHEN status = 'running' THEN duration_seconds ELSE 0 END) / 3600.0 AS running_hours,
        SUM(CASE WHEN status = 'changeover' THEN duration_seconds ELSE 0 END) / 3600.0 AS changeover_hours,
        SUM(CASE WHEN status = 'stopped' THEN duration_seconds ELSE 0 END) / 3600.0 AS stopped_hours
    FROM FilteredStatus
    GROUP BY [date]
),

StoredSummary AS (
    SELECT 
        [date],
        count(DISTINCT  machine_id) as machine_count,
        SUM(running_hours) AS running_hours,
        SUM(changeover_hours) AS changeover_hours,
        SUM(stopped_hours) AS stopped_hours
    FROM ws2_working_date
    WHERE CAST(date AS DATE) = @targetDate
    GROUP BY [date]
)

SELECT
    COALESCE(c.date, w.date) AS [date],

    ROUND(ISNULL(c.running_hours, w.running_hours), 2) AS running_hours,
    ROUND(ISNULL(c.changeover_hours, w.changeover_hours), 2) AS changeover_hours,
    ROUND(ISNULL(c.stopped_hours, w.stopped_hours), 2) AS stopped_hours,

    CAST(ISNULL(c.running_hours, w.running_hours) * 100.0 / (24 * ISNULL(c.machine_count, w.machine_count))  AS DECIMAL(5,2)) AS percent_running,
    CAST(ISNULL(c.changeover_hours, w.changeover_hours) * 100.0 / (24 * ISNULL(c.machine_count, w.machine_count)) AS DECIMAL(5,2)) AS percent_changeover,
    CAST(ISNULL(c.stopped_hours, w.stopped_hours) * 100.0 / (24 * ISNULL(c.machine_count, w.machine_count)) AS DECIMAL(5,2)) AS percent_stopped

FROM DailyCalculated c
FULL OUTER JOIN StoredSummary w
    ON c.date = w.date
WHERE COALESCE(c.date, w.date) = @targetDate
        `);
        return result.recordset || [];
    } catch (err) {
        console.error(err);
        return [];
    }
}

export async function getWorkshopReport(startDate, endDate) {
    let pool;
    try {
        pool = await getConnection();
        const result = await pool.request().query(`
DECLARE @startDate DATE = '${startDate}';
DECLARE @endDate DATE = '${endDate}';

WITH StatusWithLead AS (
    SELECT *,
        LEAD(timestamp) OVER (PARTITION BY machine_id ORDER BY timestamp) AS next_timestamp
    FROM ws2_working_status
    WHERE timestamp >= @startDate AND timestamp < DATEADD(DAY, 1, @endDate)
),

StatusExpanded AS (
    SELECT 
        machine_id,
        status,
        CAST(timestamp AS DATE) AS [date],
        timestamp AS start_time,
        CASE 
            WHEN next_timestamp IS NOT NULL AND DATEDIFF(MINUTE, timestamp, next_timestamp) <= 60 THEN next_timestamp
            WHEN next_timestamp IS NULL AND CAST(timestamp AS DATE) = CAST(GETDATE() AS DATE) THEN GETDATE()
            ELSE DATEADD(DAY, 1, CAST(timestamp AS DATE))
        END AS end_time
    FROM StatusWithLead
),

FilteredStatus AS (
    SELECT *,
        DATEDIFF(SECOND, start_time, end_time) AS duration_seconds
    FROM StatusExpanded
    WHERE DATEDIFF(MINUTE, start_time, end_time) <= 60
),

DailyCalculated AS (
    SELECT 
        machine_id,
        CAST([date] AS DATE) AS [date],
        SUM(CASE WHEN status = 'running' THEN duration_seconds ELSE 0 END) / 3600.0 AS running_hours,
        SUM(CASE WHEN status = 'changeover' THEN duration_seconds ELSE 0 END) / 3600.0 AS changeover_hours,
        SUM(CASE WHEN status = 'stopped' THEN duration_seconds ELSE 0 END) / 3600.0 AS stopped_hours
    FROM FilteredStatus
    GROUP BY machine_id, [date]
)

SELECT 
    COALESCE(r.machine_id, w.machine_id) AS machine_id,
    ISNULL(cfg.line, '-') AS line,
    COALESCE(r.date, w.date) AS [date],

    ROUND(COALESCE(r.running_hours, w.running_hours, 0), 2) AS running_hours,
    ROUND(COALESCE(r.changeover_hours, w.changeover_hours, 0), 2) AS changeover_hours,
    ROUND(COALESCE(r.stopped_hours, w.stopped_hours, 0), 2) AS stopped_hours,

    FORMAT(COALESCE(r.running_hours, w.running_hours, 0) * 100.0 / 24.0, 'N2') AS percent_running,
    FORMAT(COALESCE(r.changeover_hours, w.changeover_hours, 0) * 100.0 / 24.0, 'N2') AS percent_changeover,
    FORMAT(COALESCE(r.stopped_hours, w.stopped_hours, 0) * 100.0 / 24.0, 'N2') AS percent_stopped,

    CASE 
        WHEN r.machine_id IS NOT NULL THEN 'real-time'
        ELSE 'stored'
    END AS data_source

FROM DailyCalculated r
FULL OUTER JOIN ws2_working_date w
    ON r.machine_id = w.machine_id AND r.date = w.date

LEFT JOIN ws2_machine_config cfg
    ON COALESCE(r.machine_id, w.machine_id) = cfg.machine_id

WHERE COALESCE(r.date, w.date) BETWEEN @startDate AND @endDate
ORDER BY machine_id, [date];
        `);

        return result.recordset || [];
    } catch (err) {
        console.error(err);
        return [];
    }
}

export async function getWorkshopMachineRunTime(startDate, endDate) {
    let pool;
    try {
        pool = await getConnection();
        const result = await pool.request().query(`
DECLARE @startDate DATE = '${startDate}';
DECLARE @endDate DATE = '${endDate}';

WITH StatusWithLead AS (
    SELECT *,
        LEAD(timestamp) OVER (PARTITION BY machine_id ORDER BY timestamp) AS next_timestamp
    FROM ws2_working_status
    WHERE timestamp >= @startDate AND timestamp < DATEADD(DAY, 1, @endDate)
),

StatusExpanded AS (
    SELECT 
        machine_id,
        line,
        status,
        CAST(timestamp AS DATE) AS [date],
        timestamp AS start_time,
        CASE 
            WHEN next_timestamp IS NOT NULL AND DATEDIFF(MINUTE, timestamp, next_timestamp) <= 60 THEN next_timestamp
            WHEN next_timestamp IS NULL AND CAST(timestamp AS DATE) = CAST(GETDATE() AS DATE) THEN GETDATE()
            ELSE DATEADD(DAY, 1, CAST(timestamp AS DATE))
        END AS end_time
    FROM StatusWithLead
),

FilteredStatus AS (
    SELECT *,
        DATEDIFF(SECOND, start_time, end_time) AS duration_seconds
    FROM StatusExpanded
    WHERE DATEDIFF(MINUTE, start_time, end_time) <= 60
),

DailyCalculated AS (
    SELECT 
        machine_id,
        line,
        [date],
        SUM(CASE WHEN status = 'running' THEN duration_seconds ELSE 0 END) / 3600.0 AS running_hours,
        SUM(CASE WHEN status = 'changeover' THEN duration_seconds ELSE 0 END) / 3600.0 AS changeover_hours,
        SUM(CASE WHEN status = 'stopped' THEN duration_seconds ELSE 0 END) / 3600.0 AS stopped_hours
    FROM FilteredStatus
    GROUP BY machine_id, line, [date]
)

SELECT 
    COALESCE(c.machine_id, w.machine_id) AS machine_id,
    COALESCE(c.date, w.date) AS [date],

    ROUND(COALESCE(c.running_hours, w.running_hours, 0), 2) AS running_hours,
    ROUND(COALESCE(c.changeover_hours, w.changeover_hours, 0), 2) AS changeover_hours,
    ROUND(COALESCE(c.stopped_hours, w.stopped_hours, 0), 2) AS stopped_hours,

    FORMAT(COALESCE(c.running_hours, w.running_hours, 0) * 100.0 / 24.0, 'N2') AS percent_running,
    FORMAT(COALESCE(c.changeover_hours, w.changeover_hours, 0) * 100.0 / 24.0, 'N2') AS percent_changeover,
    FORMAT(COALESCE(c.stopped_hours, w.stopped_hours, 0) * 100.0 / 24.0, 'N2') AS percent_stopped

FROM ws2_working_date w
FULL OUTER JOIN DailyCalculated c 
    ON c.machine_id = w.machine_id AND c.date = w.date
WHERE COALESCE(c.date, w.date) BETWEEN @startDate AND @endDate
ORDER BY machine_id, [date];
        `);

        return result.recordset || [];
    } catch (err) {
        console.error(err);
        return [];
    }
}