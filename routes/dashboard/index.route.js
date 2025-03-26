import express from 'express';
var router = express.Router();
import ExcelJS from 'exceljs';
import moment from "moment-timezone";
import { getDataByDate, getDataChartByFactoryAndDate, getLastDataEachFactory } from '../../models/sensor_data.model.js';
import { authenticate } from '../../middlewares/middleware.js';
import { convertDateFormat, createWorkBookSensorData, sendResponseExcelDownload } from '../../utils/helpers.js';

const formatTimestamp = (date) => {
    return moment.utc(date).format("HH:mm:ss DD/MM/YYYY");
};

// trang chu
router.get('/', authenticate, async (req, res, next) => {
    try {
        var now = new Date();

        res.locals.isHomepage = true;

        res.locals.pageTitle = 'Trang chủ';

        // get data for 4 factory
        const factoryLastData = await getLastDataEachFactory();

        factoryLastData.forEach(data => {
            data.max_timestamp = formatTimestamp(data.max_timestamp);
        });

        // get data today
        const today = new Date().toISOString().split('T')[0];
        let data = await getDataByDate(today);

        let page = parseInt(req.query.page) || 1; // Get the current page
        let limit = 10; // Number of items per page
        let startIndex = (page - 1) * limit;
        let endIndex = page * limit;

        let paginatedData = data.slice(startIndex, endIndex); // Slice the data

        paginatedData.forEach(detail => {
            detail.timestamp = formatTimestamp(detail.timestamp);
        });

        res.render('dashboard', {
            factoryLastData: factoryLastData,
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

router.get("/dashboard/filter", authenticate, async (req, res) => {
    let { factory, location, sensor_id, time } = req.query;
    console.log('/dashboard/filter', factory, location, sensor_id, time);

    let page = parseInt(req.query.page) || 1; // Get the current page
    let limit = 10; // Number of items per page
    let startIndex = (page - 1) * limit;
    let endIndex = page * limit;

    // get data today
    let date = new Date().toISOString().split('T')[0];
    if (time && time != '') {
        date = convertDateFormat(time);
    }
    let filteredData = await getDataByDate(date, factory, location, sensor_id);

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

router.get("/dashboard/export-excel", authenticate, async (req, res) => {
    let { factory, location, sensor_id, time } = req.query;

    console.log("dashboard/export-excel", factory, location, time);

    // get data today
    let date = new Date().toISOString().split('T')[0];
    if (time && time != '') {
        date = convertDateFormat(time);
    }
    let sampleData = await getDataByDate(date, factory, location, sensor_id);

    await sendResponseExcelDownload(res, createWorkBookSensorData(sampleData), `SensorData_${factory}_${location}_${date}.xlsx`);
});

// API to get sensor data
router.get("/api/sensor-data/:id", authenticate,(req, res) => {
    const sensorId = req.params.id;
    res.json(sensorData.find(item => item.sensorId == sensorId) || { temperature: "N/A", humidity: "N/A" });
});

// API to get sensor data
router.get("/api/sensor-data", authenticate, (req, res) => {
    let { factory } = req.query;
    res.json({ sensors: sensorData });
});

router.get("/api/chart-data", authenticate, async (req, res) => {
    let { factory, time } = req.query;

    let date;
    if (time && time != '') {
        date = convertDateFormat(time);
    }
    else {
        date = new Date().toISOString().split('T')[0]; // get data today
    }
    let filteredData = await getDataChartByFactoryAndDate(factory, date);

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

export default router;