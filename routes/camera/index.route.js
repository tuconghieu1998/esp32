import express from 'express';
var router = express.Router();
import { authenticate } from '../../middlewares/middleware.js';

router.get('/', authenticate, (req, res, next) => {
    res.render('camera');
});

router.get('/workshop1', authenticate, (req, res, next) => {
    res.render('camera/workshop1.hbs');
});

router.get('/workshop2', authenticate, (req, res, next) => {
    res.render('camera/workshop2.hbs');
});

router.get('/workshop3', authenticate, (req, res, next) => {
    res.render('camera/workshop3.hbs');
});

router.get('/workshop4', authenticate, (req, res, next) => {
    res.render('camera/workshop4.hbs');
});

// Sample sensor data (replace with database query)
function generateSensorData(numSensors = 32) {
    const sensors = [];

    for (let i = 1; i <= numSensors; i++) {
        sensors.push({
            sensorId: `sensor${i}`,
            temperature: (Math.random() * (50 - 20) + 20).toFixed(1), // Random temperature between 20°C and 50°C
            humidity: (Math.random() * (80 - 40) + 40).toFixed(1) // Random humidity between 40% and 80%
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
    console.log(factory);
    res.json({ sensors: sensorData });
});

export default router;