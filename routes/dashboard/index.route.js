import express from 'express';
var router = express.Router();
import ExcelJS from 'exceljs';
import moment from "moment-timezone";
import { getDataByDate, getLastDataEachFactory } from '../../models/sensor_data.model.js';
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
        const today = '2025-03-20';//new Date().toISOString().split('T')[0];
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
    let { factory, location, time } = req.query;
    console.log('/dashboard/filter', factory, location, time);

    let page = parseInt(req.query.page) || 1; // Get the current page
    let limit = 10; // Number of items per page
    let startIndex = (page - 1) * limit;
    let endIndex = page * limit;

    // get data today
    let date = '2025-03-20';//new Date().toISOString().split('T')[0];
    if (time && time != '') {
        date = convertDateFormat(time);
    }
    let filteredData = await getDataByDate(date);

    // Apply filters if they are selected
    if (factory && factory !== "") {
        filteredData = filteredData.filter(item => item.factory.trim() == factory);
    }

    if (location && location !== "") {
        filteredData = filteredData.filter(item => item.location.trim() == location);
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

router.get("/dashboard/export-excel", authenticate, async (req, res) => {
    let { factory, location, time } = req.query;

    console.log("dashboard/export-excel", factory, location, time);

    // get data today
    let date = '2025-03-20';//new Date().toISOString().split('T')[0];
    if (time && time != '') {
        date = convertDateFormat(time);
    }
    let sampleData = await getDataByDate(date);

    // Apply filters if they are selected
    if (factory && factory !== "") {
        sampleData = sampleData.filter(item => item.factory.trim() == factory);
    }

    if (location && location !== "") {
        sampleData = sampleData.filter(item => item.location.trim() == location);
    }

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

export default router;