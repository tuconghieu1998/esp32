import express from 'express';
var router = express.Router();
import expressWs from 'express-ws';
import { authenticate } from '../../middlewares/middleware.js';
import { WebSocketServer } from 'ws';
expressWs(router); // Enable WebSocket support on this router
import axios from 'axios';
import { getHoursMachineWorkingByStatus, getListMachines, getTimeLineMachineWorking, getTimeMachineRunningInMonth, getTimeWorkshop2RunningInDate, getTimeWorkshop2RunningInMonth, getWorkshopMachineRunTime, getWorkshopReport } from '../../models/machine.model.js';
import moment from 'moment';
import { convertDateFormat, createWorkBookWorkshopReport, sendResponseExcelDownload } from '../../utils/helpers.js';

const DELAY_SEND_WS = 1000;
const clients = new Set();
const MACHINE_200_SERVER_URL = process.env.MACHINE_200_SERVER_URL;

router.get('/', authenticate, (req, res, next) => {
    try {
        res.render('machine');
    }
    catch (e) {
        console.log(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get('/workshop-report', authenticate, (req, res, next) => {
    try {
        res.render('machine/workshop_report.hbs');
    }
    catch (e) {
        console.log(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get('/api/workshop-report', authenticate, async (req, res, next) => {
    try {
        let { start_date, end_date, page } = req.query;
        page = page || 1;
        const limit = 20; // Number of items per page
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        const today = new Date().toISOString().split('T')[0];
        start_date = start_date ? convertDateFormat(start_date) : today;
        end_date = end_date ? convertDateFormat(end_date) : today;

        let data = await getWorkshopReport(start_date, end_date);
        const total_pages = Math.ceil(data.length / limit);
        data = data.slice(startIndex, endIndex);

        res.json({ data, current_page: page, limit, total_pages });
    }
    catch (e) {
        console.log(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/api/workshop-report/excel", authenticate, async (req, res) => {
    let { start_date, end_date } = req.query;

    const today = new Date().toISOString().split('T')[0];
    start_date = start_date ? convertDateFormat(start_date) : today;
    end_date = end_date ? convertDateFormat(end_date) : today;

    let data = await getWorkshopReport(start_date, end_date);
    await sendResponseExcelDownload(res, createWorkBookWorkshopReport(data), `Workshop2_${start_date}_${end_date}.xlsx`);
});

router.get('/ws2', async (req, res, next) => {
    try {
        let machines = MACHINES_DATA;
        res.render('machine/workshop2.hbs', {
            machines
        });
    }
    catch (e) {
        console.log(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

async function getMachineWorkingTimeByStatus(machineId, date) {
    const workingData = await getHoursMachineWorkingByStatus(machineId, date);
    let timeRunning = 0, timeStopped = 0, timeChangeOver = 0, timeDisconnected = 0;
    for (const row of workingData) {
        const time = row.total_duration;
        switch (row.status) {
            case 'running':
                timeRunning += time;
                break;
            case 'stopped':
                timeStopped += time;
                break;
            case 'changeover':
                timeChangeOver += time;
                break;
            case 'disconnected':
                timeDisconnected += time;
                break;
        }
    }
    let percentRunning = (timeRunning / 86400 * 100).toFixed(2);
    timeRunning = (timeRunning / 3600).toFixed(2);
    timeStopped = (timeStopped / 3600).toFixed(2);
    timeChangeOver = (timeChangeOver / 3600).toFixed(2);
    timeDisconnected = (timeDisconnected / 3600).toFixed(2);
    return {
        percentRunning,
        timeRunning,
        timeStopped,
        timeDisconnected,
        timeChangeOver
    }
}

router.get('/machine-dashboard/:machine_id', authenticate, async (req, res, next) => {
    try {
        const machine_id = req.params.machine_id;
        const date = getCurrentDate();
        const data = await getMachineWorkingTimeByStatus(machine_id, date);
        let percent_running = 0, running_hours = 0, stopped_hours = 0, changeover_hours = 0;
        if (data) {
            percent_running = data.percentRunning;
            running_hours = data.timeRunning;
            stopped_hours = data.timeStopped;
            changeover_hours = data.timeChangeOver;
        }
        let max_percent = getMaxPercentPassedToday();
        let sub_percent = (max_percent - percent_running).toFixed(2);
        res.render('machine/machine_dashboard.hbs', { machine_id, percent_running, running_hours, stopped_hours, changeover_hours, max_percent, sub_percent });
    }
    catch (e) {
        console.log(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/api/machine-dashboard", async (req, res) => {
    try {
        let { machine_id, date } = req.query;
        let dateFormat = new Date().toISOString().split('T')[0];
        if (date && date != '') {
            dateFormat = convertDateFormat(date);
        }
        const workingTime = await getMachineWorkingTimeByStatus(machine_id, dateFormat);
        res.json({
            workingTime
        });
    }
    catch (e) {
        console.log(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/api/machine-timeline", async (req, res) => {
    try {
        let { machine_id, date } = req.query;
        let dateFormat = new Date().toISOString().split('T')[0];
        if (date && date != '') {
            dateFormat = convertDateFormat(date);
        }
        const data = await getTimeLineMachineWorking(machine_id, dateFormat);
        res.json({
            data
        });
    }
    catch (e) {
        console.log(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/api/machine-month", async (req, res) => {
    try {
        let { machine_id, date } = req.query;
        let dateFormat = new Date().toISOString().split('T')[0];
        if (date && date != '') {
            dateFormat = convertDateFormat(date);
        }
        const data = await getTimeMachineRunningInMonth(machine_id, dateFormat);
        res.json({
            data
        });
    }
    catch (e) {
        console.log(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/api/workshop2-date", async (req, res) => {
    try {
        let { date } = req.query;
        let dateFormat = new Date().toISOString().split('T')[0];
        if (date && date != '') {
            dateFormat = convertDateFormat(date);
        }
        const data = await getTimeWorkshop2RunningInDate(dateFormat);
        res.json({
            data
        });
    }
    catch (e) {
        console.log(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/api/workshop2-month", async (req, res) => {
    try {
        let { date } = req.query;
        let dateFormat = new Date().toISOString().split('T')[0];
        if (date && date != '') {
            dateFormat = convertDateFormat(date);
        }
        const data = await getTimeWorkshop2RunningInMonth(dateFormat);
        res.json({
            data
        });
    }
    catch (e) {
        console.log(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get('/workshop-dashboard', authenticate, async (req, res, next) => {
    try {
        const date = getCurrentDate();
        const data = await getTimeWorkshop2RunningInDate(date);
        let percent_running = 0, running_hours = 0, stopped_hours = 0, changeover_hours = 0;
        if (data && data[0]) {
            percent_running = data[0].percent_running;
            running_hours = data[0].running_hours;
            stopped_hours = data[0].stopped_hours;
            changeover_hours = data[0].changeover_hours;
        }
        let max_percent = getMaxPercentPassedToday();
        let sub_percent = (max_percent - percent_running).toFixed(2);
        res.render('machine/workshop_dashboard.hbs', { percent_running, running_hours, stopped_hours, changeover_hours, max_percent, sub_percent });
    }
    catch (e) {
        console.log(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get('/workshop-heatmap', authenticate, async (req, res, next) => {
    try {
        res.render('machine/workshop_overview.hbs');
    }
    catch (e) {
        console.log(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get('/api/workshop-heatmap', authenticate, async (req, res, next) => {
    try {
        let { start_date, end_date } = req.query;

        const today = new Date().toISOString().split('T')[0];
        start_date = start_date ? convertDateFormat(start_date) : today;
        end_date = end_date ? convertDateFormat(end_date) : today;

        let data = await getWorkshopMachineRunTime(start_date, end_date);

        res.json({ data });
    }
    catch (e) {
        console.log(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

function getMaxPercentPassedToday() {
    // Expecting format 'dd/mm/yyyy'
    const now = new Date();
    const secondsPerDay = 86400;
    const secondsSinceMidnight =
        now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const percent = (secondsSinceMidnight / secondsPerDay) * 100;
    return percent.toFixed(2);
}

router.get('/machine-config', authenticate, async (req, res, next) => {
    try {
        res.render('machine/machine_config.hbs');
    }
    catch (e) {
        console.log(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

function getCurrentDate() {
    return moment().format('YYYY-MM-DD');
}

function getCurrentTime() {
    return moment().format('YYYY-MM-DD HH:mm:ss');
}


// WebSocket route for machine data
router.ws('/socket/ws2', (ws, req) => {
    try {
        console.log('WebSocket client connected');
        clients.add(ws);

        ws.on('close', () => {
            console.log('Client disconnected');
            clients.delete(ws);
        });
    }
    catch (e) {
        console.error(e);
    }
});

// Function to fetch machine data
async function getMachineData() {
    try {
        const response = await axios.get(MACHINE_200_SERVER_URL);
        if (response.status == 200) {
            const machineData = response.data;
            return machineData;
            // Do something with the machine data, such as broadcasting it to clients
        }
        return {};
    } catch (error) {
        //console.error('Error fetching machine data:', error);
        return {};
    }
}

function hasClientReady() {
    for (const client of clients) {
        if (client.readyState === 1) {
            return true;
        }
    }
    return false;
}

// Function to simulate and broadcast machine data
async function broadcastMachineData() {
    try {
        if (hasClientReady()) {
            const updated = await updateMachinesData();
            if (!updated) return;
            const data = JSON.stringify({ machine_states: MACHINES_DATA, time_server: MACHINE_TIME_SERVER });

            for (const client of clients) {
                if (client.readyState === 1) {
                    client.send(data);
                }
            }
        }
    } catch (error) {
        console.error('Error fetching machine data:', error);
    }
}

// Periodically broadcast data
setInterval(broadcastMachineData, DELAY_SEND_WS);

let MACHINES_DATA = await initMachines();
let MACHINE_TIME_SERVER;

async function updateMachinesData() {
    let data = await getMachineData();
    if(Object.keys(data).length == 0) return false;
    let machines = data.machine_states;
    MACHINE_TIME_SERVER = data.current_time;
    for (let i = 0; i < MACHINES_DATA.length; i++) {
        let sensor_id = MACHINES_DATA[i].sensor_id;
        if (machines[sensor_id]) {
            MACHINES_DATA[i].status = machines[sensor_id].status;
            MACHINES_DATA[i].update_time = machines[sensor_id].update_time;
        }
    }
    return true;
}

async function initMachines() {
    // get machines config from db
    let machinesConfig = [];
    machinesConfig = await getListMachines();

    // init array machines data
    let machines = [];
    let currentTime = getCurrentTime();
    for (let i = 0; i < machinesConfig.length; i++) {
        machines.push({
            sensor_id: machinesConfig[i].sensor_id,
            machine_id: machinesConfig[i].machine_id,
            line: machinesConfig[i].line,
            status: 'disconnected',
            update_time: currentTime,
        });
    }
    return machines;
}

export default router;