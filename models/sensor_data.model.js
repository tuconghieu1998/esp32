import { getConnection, closeConnection } from "../db.js";

const table_name = "sensor_data";

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

export async function getSensorsByFactory(factory) {
    let pool;
    try {
        pool = await getConnection();
        const result = await pool.request().query(`
        SELECT *
        FROM sensors
        WHERE '${factory}' = '' OR LTRIM(RTRIM(factory)) = '${factory}'
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

export async function getDataByDate(date, factory = '', location = '', sensor_id = '') {
    let pool;
    try {
        pool = await getConnection();
        const result = await pool.request().query(`
SELECT * 
FROM ${table_name} 
WHERE CAST(timestamp AS DATE) = '${date}'
    AND ('${factory}' = '' OR LTRIM(RTRIM(factory)) = '${factory}')
    AND ('${location}' = '' OR LTRIM(RTRIM(location)) = '${location}')
    AND ('${sensor_id}' = '' OR LTRIM(RTRIM(sensor_id)) = '${sensor_id}')
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

export async function getDataChartByDate(factory, location, sensor_id, date) {
    let pool;
    try {
        pool = await getConnection();
        const result = await pool.request().query(`
SELECT 
    CAST(timestamp AS DATE) AS date,
    DATEPART(HOUR, timestamp) AS hour,
    ROUND(AVG(temperature), 2) AS avg_temperature,
    ROUND(AVG(humidity), 2) AS avg_humidity,
    ROUND(AVG(sound), 2) AS avg_sound,
    ROUND(AVG(light), 2) AS avg_light
FROM ${table_name}
WHERE CAST(timestamp AS DATE) = '${date}'
    AND ('${factory}' = '' OR LTRIM(RTRIM(factory)) = '${factory}')
    AND ('${location}' = '' OR LTRIM(RTRIM(location)) = '${location}')
    AND ('${sensor_id}' = '' OR LTRIM(RTRIM(sensor_id)) = '${sensor_id}')
GROUP BY CAST(timestamp AS DATE), DATEPART(HOUR, timestamp)
ORDER BY date DESC, hour ASC;
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

export async function getDataChartByFactoryAndDate(factory, date) {
    let pool;
    try {
        pool = await getConnection();
        const result = await pool.request().query(`
SELECT 
    factory,
    CAST(timestamp AS DATE) AS date,
    DATEPART(HOUR, timestamp) AS hour,
    ROUND(AVG(temperature), 2) AS avg_temperature,
    ROUND(AVG(humidity), 2) AS avg_humidity,
    ROUND(AVG(sound), 2) AS avg_sound,
    ROUND(AVG(light), 2) AS avg_light
FROM ${table_name}
WHERE CAST(timestamp AS DATE) = '${date}' and factory = '${factory}'
GROUP BY factory, CAST(timestamp AS DATE), DATEPART(HOUR, timestamp)
ORDER BY date DESC, hour ASC;
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

export async function getDataChartForWorkshop(date) {
    let pool;
    try {
        pool = await getConnection();
        const result = await pool.request().query(`
SELECT 
    factory,
    CAST(timestamp AS DATE) AS date,
    DATEPART(HOUR, timestamp) AS hour,
    ROUND(AVG(temperature), 2) AS avg_temperature,
    ROUND(AVG(humidity), 2) AS avg_humidity,
    ROUND(AVG(sound), 2) AS avg_sound,
    ROUND(AVG(light), 2) AS avg_light
FROM ${table_name}
WHERE CAST(timestamp AS DATE) = '${date}'
GROUP BY factory, CAST(timestamp AS DATE), DATEPART(HOUR, timestamp)
ORDER BY factory ASC, date DESC, hour ASC;
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

export async function getLastDataSensorsInDate(date) {
    let pool;
    try {
        pool = await getConnection();
        const result = await pool.request().query(`
WITH LatestData AS (
    SELECT *, 
           ROW_NUMBER() OVER (PARTITION BY sensor_id ORDER BY timestamp DESC) AS rn
    FROM ${table_name}
    WHERE CAST(timestamp AS DATE) = '${date}'
)
SELECT *
FROM LatestData
WHERE rn = 1
ORDER BY sensor_id;
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