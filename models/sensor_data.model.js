import { getConnection, closeConnection } from "../db.js";

const table_name = "sensor_data_test";

export async function getListSensors() {
    let pool;
    try {
        pool = await getConnection();
        const result = await pool.request().query(`
        SELECT *
        FROM sensors
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

export async function getLastDataEachSensor() {
    let pool;
    try {
        pool = await getConnection();
        const result = await pool.request().query(`
        WITH LatestData AS (
            SELECT *, 
                ROW_NUMBER() OVER (PARTITION BY sensor_id ORDER BY timestamp DESC) AS rn
            FROM ${table_name}
        )
        SELECT id, sensor_id, temperature, humidity, sound, light, factory, location, timestamp
        FROM LatestData
        WHERE rn = 1
        ORDER BY factory;
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

export async function getLastDataEachFactory() {
    let pool;
    try {
        pool = await getConnection();
        const result = await pool.request().query(`
WITH LatestData AS (
    SELECT *, 
           ROW_NUMBER() OVER (PARTITION BY sensor_id ORDER BY timestamp DESC) AS rn
    FROM ${table_name}
),
FilteredData AS (
    SELECT *
    FROM LatestData
    WHERE rn = 1
),
MaxTimestamps AS (
    SELECT factory, MAX(timestamp) AS max_timestamp
    FROM FilteredData
    GROUP BY factory
)
SELECT 
    f.factory,
    ROUND(AVG(f.temperature), 0) AS avg_temperature,
    ROUND(AVG(f.humidity), 0) AS avg_humidity,
    ROUND(AVG(f.sound), 0) AS avg_sound,
    ROUND(AVG(f.light), 0) AS avg_light,
    m.max_timestamp
FROM FilteredData f
JOIN MaxTimestamps m ON f.factory = m.factory
WHERE f.timestamp >= DATEADD(MINUTE, -30, m.max_timestamp)
GROUP BY f.factory, m.max_timestamp
ORDER BY f.factory;
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

export async function getDataByDate(date) {
    let pool;
    try {
        pool = await getConnection();
        const result = await pool.request().query(`
SELECT * 
FROM ${table_name} 
WHERE CAST(timestamp AS DATE) = '${date}'
ORDER BY timestamp DESC;
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