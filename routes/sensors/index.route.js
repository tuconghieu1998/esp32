import express from 'express';
var router = express.Router();
import { getDataByDate, getDataChartByDate, getDataChartForWorkshop, getLastDataEachFactory, getLastDataEachSensor } from '../../models/sensor_data.model.js';
import { authenticate } from '../../middlewares/middleware.js';
import { convertDateFormat, formatTimestamp } from '../../utils/helpers.js';

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

// trang chu
router.get('/chart', authenticate, async (req, res, next) => {
    try {
        res.locals.pageTitle = 'Chart';
        // get data today
        const today = new Date().toISOString().split('T')[0];
        let data = await getDataByDate(today);

        let page = parseInt(req.query.page) || 1; // Get the current page
        let limit = 20; // Number of items per page
        let startIndex = (page - 1) * limit;
        let endIndex = page * limit;

        let paginatedData = data.slice(startIndex, endIndex); // Slice the data

        paginatedData.forEach(detail => {
            detail.timestamp = formatTimestamp(detail.timestamp);
        });

        res.render('sensors/sensor_chart.hbs', {
            details: paginatedData,
            currentPage: page,
            totalPages: Math.ceil(data.length / limit),
            limit
        });
    }
    catch (e) {
        console.log(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/chart-data", authenticate, async (req, res) => {
    let { factory, location, sensor_id, time } = req.query;

    let date;
    if (time && time != '') {
        date = convertDateFormat(time);
    }
    else {
        date = new Date().toISOString().split('T')[0]; // get data today
    }
    let filteredData = await getDataChartByDate(factory, location, sensor_id, date);

    const labels = [];
    const temperatures = [];
    const humidities = [];
    const sounds = [];
    const lights = [];

    filteredData.forEach(item => {
        labels.push(item.hour);
        temperatures.push(item.avg_temperature);
        humidities.push(item.avg_humidity);
        sounds.push(item.avg_sound);
        lights.push(item.avg_light);
    })

    res.json({
        labels, temperatures, humidities, sounds, lights
    });
});

router.get("/filter", authenticate, async (req, res) => {
    let { factory, location, sensor_id, time } = req.query;
    console.log('/sensors/filter', factory, sensor_id, location, time);

    let page = parseInt(req.query.page) || 1; // Get the current page
    let limit = 20; // Number of items per page
    let startIndex = (page - 1) * limit;
    let endIndex = page * limit;

    let date;
    if (time && time != '') {
        date = convertDateFormat(time);
    }
    else {
        date = new Date().toISOString().split('T')[0]; // get data today
    }
    let filteredData = await getDataByDate(date);

    // Apply filters if they are selected
    if (factory && factory !== "") {
        filteredData = filteredData.filter(item => item.factory.trim() == factory);
    }
    if (location && location !== "") {
        filteredData = filteredData.filter(item => item.location.trim() == location);
    }
    if (sensor_id && sensor_id !== "") {
        filteredData = filteredData.filter(item => item.sensor_id.trim() == sensor_id);
    }

    let paginatedData = filteredData.slice(startIndex, endIndex); // Slice the data

    paginatedData.forEach(detail => {
        detail.timestamp = formatTimestamp(detail.timestamp);
    });

    res.json({
        details: paginatedData,
        currentPage: page,
        limit,
        totalPages: Math.ceil(filteredData.length / limit)
    });
});

router.get("/export-excel", authenticate, async (req, res) => {
    let { factory, location, sensor, time } = req.query;
    console.log('/sensors/export-excel', factory, sensor_id, location, time);

    let date;
    if (time && time != '') {
        date = convertDateFormat(time);
    }
    else {
        date = new Date().toISOString().split('T')[0]; // get data today
    }
    let filteredData = await getDataByDate(date);

    // Apply filters if they are selected
    if (factory && factory !== "") {
        filteredData = filteredData.filter(item => item.factory.trim() == factory);
    }
    if (location && location !== "") {
        filteredData = filteredData.filter(item => item.location.trim() == location);
    }
    if (sensor_id && sensor_id !== "") {
        filteredData = filteredData.filter(item => item.sensor_id.trim() == sensor_id);
    }

    await sendResponseExcelDownload(res, createWorkBookSensorData(filteredData), `SensorData_${factory}_${location}_${sensor_id}_${date}.xlsx`);
});

router.get('/workshop-chart', authenticate, async (req, res, next) => {
    try {
        res.locals.pageTitle = 'WorkshopChart';
        const {time, type} = req.query;
        // get data today
        let date;
        if (time && time != '') {
            date = convertDateFormat(time);
        }
        else {
            date = new Date().toISOString().split('T')[0]; // get data today
        }
        let data = await getDataChartForWorkshop(date);

        let page = parseInt(req.query.page) || 1; // Get the current page
        let limit = 20; // Number of items per page
        let startIndex = (page - 1) * limit;
        let endIndex = page * limit;

        let paginatedData = data.slice(startIndex, endIndex); // Slice the data

        paginatedData.forEach(detail => {
            detail.timestamp = formatTimestamp(detail.timestamp);
        });

        res.render('sensors/workshop_avg_chart.hbs', {
            details: paginatedData,
            currentPage: page,
            totalPages: Math.ceil(data.length / limit),
            limit
        });
    }
    catch (e) {
        console.log(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/workshop-chart-data", authenticate, async (req, res) => {
    let { type, time } = req.query;

    let date;
    if (time && time != '') {
        date = convertDateFormat(time);
    }
    else {
        date = new Date().toISOString().split('T')[0]; // get data today
    }
    let filteredData = await getDataChartForWorkshop(date);

    const labels = [];
    const F1 = {
        temperatures: [],
        humidities: [],
        sounds: [],
        lights: []
    };
    const F2 = {
        temperatures: [],
        humidities: [],
        sounds: [],
        lights: []
    };
    const F3 = {
        temperatures: [],
        humidities: [],
        sounds: [],
        lights: []
    };
    const F4 = {
        temperatures: [],
        humidities: [],
        sounds: [],
        lights: []
    };

    filteredData.forEach(item => {
        if (labels.findIndex(label => label == item.hour) == -1) {
            labels.push(item.hour);
        }
        const factory = item.factory.trim();
        
        switch (factory) {
            case "F1":
                F1.temperatures.push(item.avg_temperature);
                F1.humidities.push(item.avg_humidity);
                F1.sounds.push(item.avg_sound);
                F1.lights.push(item.avg_light);
                break;
            case "F2":
                F2.temperatures.push(item.avg_temperature);
                F2.humidities.push(item.avg_humidity);
                F2.sounds.push(item.avg_sound);
                F2.lights.push(item.avg_light);
                break;
            case "F3":
                F3.temperatures.push(item.avg_temperature);
                F3.humidities.push(item.avg_humidity);
                F3.sounds.push(item.avg_sound);
                F3.lights.push(item.avg_light);
                break;
            case "F4":
                F4.temperatures.push(item.avg_temperature);
                F4.humidities.push(item.avg_humidity);
                F4.sounds.push(item.avg_sound);
                F4.lights.push(item.avg_light);
                break;
        }
    });

    res.json({
        labels, F1, F2, F3, F4
    });
});



export default router;