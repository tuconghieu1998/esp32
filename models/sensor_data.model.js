import { getConnection, closeConnection } from "../db.js";

export async function getLastDataEachSensor() {
    let pool;
    try {
        pool = await getConnection();
        const result = await pool.request().query(`
        WITH LatestData AS (
            SELECT *, 
                ROW_NUMBER() OVER (PARTITION BY sensor_id ORDER BY timestamp DESC) AS rn
            FROM sensor_data
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
    FROM sensor_data
)
SELECT 
    factory,
    ROUND(AVG(temperature), 0) AS avg_temperature,
    ROUND(AVG(humidity), 0) AS avg_humidity,
    ROUND(AVG(sound), 0) AS avg_sound,
    ROUND(AVG(light), 0) AS avg_light,
	MAX(timestamp) AS max_timestamp
FROM LatestData
WHERE rn = 1
GROUP BY factory
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

export async function getDataByDate(date) {
    let pool;
    try {
        pool = await getConnection();
        const result = await pool.request().query(`
SELECT * 
FROM sensor_data 
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