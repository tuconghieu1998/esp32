import express from 'express';
var router = express.Router();
import { getConnection, closeConnection, sql } from "../../db.js";
import moment from "moment";
import { getLastDataEachFactory, getLastDataEachSensor } from '../../models/sensor_data.model.js';
import { authenticate } from '../../middlewares/middleware.js';

const formatTimestamp = (date) => {
    return moment(date).format("HH:mm:ss DD/MM/YYYY");
};

// trang chu
router.get('/', authenticate, (req, res, next) => {
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
router.get("/sensor-data/:id", authenticate, (req, res) => {
    const sensorId = req.params.id;
    res.json(sensorData.find(item => item.sensorId == sensorId) || { temperature: "N/A", humidity: "N/A" });
});

// API to get sensor data
router.get("/sensor-data", authenticate, (req, res) => {
    let { factory } = req.query;
    res.json({ sensors: sensorData });
});


router.get("/api/sensor-last-data", authenticate, async (req, res) => {
    try {
        const data = await getLastDataEachSensor();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/api/factory-last-data", authenticate, async (req, res) => {
    try {
        const data = await getLastDataEachFactory();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});



export default router;