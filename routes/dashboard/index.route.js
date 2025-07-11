import express from 'express';
var router = express.Router();
import axios from 'axios';
import moment from "moment-timezone";
import { getDataByDate, getDataChartByFactoryAndDate, getLastDataEachFactory } from '../../models/sensor_data.model.js';
import { authenticate } from '../../middlewares/middleware.js';
import { convertDateFormat, createWorkBookSensorData, sendResponseExcelDownload } from '../../utils/helpers.js';

const formatTimestamp = (date) => {
    return moment.utc(date).format("HH:mm:ss DD/MM/YYYY");
};

const WEATHER_KEY = process.env.WEATHER_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const ACCUWEATHER_KEY = process.env.ACCUWEATHER_KEY;

// trang chu
router.get('/', async (req, res, next) => {
    try {
        var now = new Date();

        res.locals.isHomepage = true;

        res.locals.pageTitle = 'Trang chủ';

        // get data for 4 factory
        const results = await getLastDataEachFactory();

        let factoryLastData = [null, null, null, null];
        results.forEach(result=>{
            switch(result.factory.trim()) {
                case "F1":
                    factoryLastData[0] = result;
                    break;
                case "F2":
                    factoryLastData[1] = result;
                    break;
                case "F3":
                    factoryLastData[2] = result;
                    break;
                case "F4":
                    factoryLastData[3] = result;
                    break;
            }
        });

        factoryLastData.forEach(data => {
            if(data && data.max_timestamp) {
                data.max_timestamp = formatTimestamp(data.max_timestamp);
            }
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

router.get('/weather', async (req, res) => {
    try {
        
        // const lat = 15.211005;
        // const lon = 108.782677;
        // http://dataservice.accuweather.com/locations/v1/cities/geoposition/search?apikey=${ACCUWEATHER_KEY}&q=15.211005,108.782677
        const url = `http://dataservice.accuweather.com/currentconditions/v1/416393?apikey=${ACCUWEATHER_KEY}&details=true`;
        //const url = `https://weather.googleapis.com/v1/currentConditions:lookup?key=${GOOGLE_API_KEY}&location.latitude=${lat}&location.longitude=${lon}`;
        // const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_KEY}&units=metric&lang=en`;
        // console.log('/weather', url);
        const response = await axios.get(url);
        // console.log(response.data);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch weather data' });
    }
});

router.get("/dashboard/filter", async (req, res) => {
    let { factory, location, sensor_id, time } = req.query;
    // console.log('/dashboard/filter', factory, location, sensor_id, time);

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

router.get("/dashboard/export-excel", async (req, res) => {
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
router.get("/api/sensor-data/:id", (req, res) => {
    const sensorId = req.params.id;
    res.json(sensorData.find(item => item.sensorId == sensorId) || { temperature: "N/A", humidity: "N/A" });
});

// API to get sensor data
router.get("/api/sensor-data", (req, res) => {
    let { factory } = req.query;
    res.json({ sensors: sensorData });
});

router.get("/api/chart-data", async (req, res) => {
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