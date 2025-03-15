import express from 'express';
var router = express.Router();
import { getConnection, closeConnection, sql } from "../../db.js";
import moment from "moment";

const formatTimestamp = (date) => {
    return moment(date).format("HH:mm:ss DD/MM/YYYY");
};

// trang chu
router.get('/', (req, res, next) => {
    res.render('sensors');
});

// Sample sensor data (replace with database query)
function generateSensorData(numSensors = 32) {
    const sensors = [];

    for (let i = 1; i <= numSensors; i++) {
        sensors.push({
            sensorId: `sensor${i}`,
            temperature: (Math.random() * (50 - 20) + 20).toFixed(1), // Random temperature between 20°C and 50°C
            humidity: (Math.random() * (80 - 40) + 40).toFixed(1), // Random humidity between 40% and 80%
            sound: (Math.random() * (80 - 30) + 30).toFixed(1), // Random sound level between 30dB and 80dB
            light: (Math.random() * (1000 - 100) + 100).toFixed(1) // Random light intensity between 100 Lux and 1000 Lux
        });
    }

    return sensors;
}

// Generate 32 sensor data entries
const sensorData = generateSensorData(32);

// API to get sensor data
router.get("/sensor-data/:id", (req, res) => {
    const sensorId = req.params.id;
    res.json(sensorData.find(item => item.sensorId == sensorId) || { temperature: "N/A", humidity: "N/A" });
});

// API to get sensor data
router.get("/sensor-data", (req, res) => {
    let { factory } = req.query;
    res.json({ sensors: sensorData });
});


router.get("/api/sensor-last-data", async (req, res) => {
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
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    } finally {
        if (pool) {
            await closeConnection(); // Close connection after request
        }
    }
});



export default router;