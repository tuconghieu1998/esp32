import express from 'express';
var router = express.Router();
import expressWs from 'express-ws';
import { authenticate } from '../../middlewares/middleware.js';
import { WebSocketServer } from 'ws';
expressWs(router); // Enable WebSocket support on this router
import axios from 'axios';
import { createSensorConfig, deleteSensorConfig, editSensorConfig, getConfigByMachineId, getConfigBySensorId, getHoursMachineWorkingByStatus, getLastSensorIdInConfig, getListMachines, getTimeLineMachineWorking, getTimeMachineRunningInMonth, getTimeWorkshop2RunningInDate, getTimeWorkshop2RunningInMonth, getWorkshopMachineRunTime, getWorkshopReport } from '../../models/machine.model.js';
import moment from 'moment';
import { convertDateFormat, createWorkBookWorkshopReport, createWorkBookWS2MachineConfig, sendResponseExcelDownload } from '../../utils/helpers.js';

const DELAY_SEND_WS = 1000;
const clients = new Set();
const MACHINE_200_SERVER_URL = process.env.MACHINE_200_SERVER_URL;

router.get('/', (req, res, next) => {
    try {
        res.render('machine');
    }
    catch (e) {
        console.log(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get('/workshop-report', (req, res, next) => {
    try {
        res.render('machine/workshop_report.hbs');
    }
    catch (e) {
        console.log(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get('/api/workshop-report', async (req, res, next) => {
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

router.get("/api/workshop-report/excel", async (req, res) => {
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

router.get('/ws2-fullscreen', async (req, res, next) => {
    try {
        let machines = MACHINES_DATA;
        res.render('machine/workshop_fullscreen.hbs', {
            machines,
            layout: false
        });
    }
    catch (e) {
        console.log(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

async function getMachineWorkingTimeByStatus(machineId, fromDate, toDate) {
    const workingData = await getHoursMachineWorkingByStatus(machineId, fromDate, toDate);
    let timeRunning = 0, timeStopped = 0, timeChangeOver = 0, count = 0;

    for(const row of workingData) {
        timeRunning += row['running_hours'];
        timeStopped += row['stopped_hours'];
        timeChangeOver += row['changeover_hours'];
        count++;
    }
    
    let percentRunning = Math.min(100, (timeRunning / (24 * Math.max(count, 1)) * 100).toFixed(2));

    return {
        percentRunning,
        timeRunning,
        timeStopped,
        timeChangeOver
    }
}

router.get('/machine-dashboard/:machine_id', async (req, res, next) => {
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
        let { machine_id, from_date, to_date } = req.query;
        let dateFormat = new Date().toISOString().split('T')[0];
        let fromDate = dateFormat, toDate = dateFormat;
        if (from_date && from_date != '') {
            fromDate = convertDateFormat(from_date);
        }
        if (to_date && to_date != '') {
            toDate = convertDateFormat(to_date);
        }
        const workingTime = await getMachineWorkingTimeByStatus(machine_id, fromDate, toDate);
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

router.get('/workshop-dashboard', async (req, res, next) => {
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

router.get('/workshop-heatmap', async (req, res, next) => {
    try {
        res.render('machine/workshop_overview.hbs');
    }
    catch (e) {
        console.log(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get('/api/workshop-heatmap', async (req, res, next) => {
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

router.get('/sensor-config', authenticate, async (req, res, next) => {
    try {
        res.render('machine/sensor_config.hbs');
    }
    catch (e) {
        console.log(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get('/api/sensor-config', authenticate, async (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    try {
        let { page } = req.query;
        page = page || 1;
        const limit = 20; // Number of items per page
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        let data = await getListMachines();
        const total_pages = Math.ceil(data.length / limit);
        data = data.slice(startIndex, endIndex);

        res.json({ data, current_page: page, limit, total_pages });
    }
    catch (e) {
        console.log(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/api/sensor-config/excel", authenticate, async (req, res) => {
    let data = await getListMachines();
    await sendResponseExcelDownload(res, createWorkBookWS2MachineConfig(data), `Workshop2_MachineConfig.xlsx`);
});

router.post('/api/sensor-config', authenticate, async (req, res) => {
    try {
        const { sensor_id, machine_id, line, note } = req.body;
        console.log("POST sensor config", sensor_id, machine_id, line, note);
        if (!sensor_id || !machine_id || !line) {
            return res.status(400).json({ message: 'Missing data!' });
        }

        if (isNaN(machine_id)) {
            return res.status(400).json({ message: 'Machine ID is not valid!' });
        }

        if (isNaN(line)) {
            return res.status(400).json({ message: 'Line is not valid!' });
        }

        let config = await getConfigBySensorId(sensor_id);
        if (config.length > 0) {
            return res.status(409).json({ message: 'Sensor ID is exist!' });
        }

        let success = await createSensorConfig({
            sensor_id,
            machine_id,
            line,
            note
        });
        if (success) {
            return res.status(200).json({ message: 'Create Sensor Config successfully!' });
        }
        return res.status(400).json({ message: 'Create config Error' });
    }
    catch (e) {
        console.error(e);
        return res.status(400).json({ message: "Bad request" });
    }
});

router.put('/api/sensor-config/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { sensor_id, machine_id, line, note } = req.body;
        console.log("PUT sensor config", sensor_id, machine_id, line, note);
        if (!sensor_id || !machine_id || !line) {
            return res.status(400).json({ message: 'Missing data!' });
        }

        if (isNaN(machine_id)) {
            return res.status(400).json({ message: 'Machine ID is not valid!' });
        }

        if (isNaN(line)) {
            return res.status(400).json({ message: 'Line is not valid!' });
        }

        let success = await editSensorConfig({
            id,
            sensor_id,
            machine_id,
            line,
            note
        });
        if (success) {
            return res.status(200).json({ message: 'Edit Sensor Config successfully!' });
        }
        return res.status(400).json({ message: 'Edit config Error' });
    }
    catch (e) {
        console.error(e);
        return res.status(400).json({ message: "Bad request" });
    }
});

router.delete('/api/sensor-config/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    try {
        console.log("DELETE: ", id);
        let success = await deleteSensorConfig(id);
        if (success) {
            return res.status(200).json({ message: 'Deleted successfully' });
        }
        return res.status(400).json({ message: 'Delete failed' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Delete failed' });
    }
});

router.put('/api/sync-sensor-config', authenticate, async (req, res) => {
    try {
        let success = await syncMachinesConfig();
        if (success) {
            return res.status(200).json({ message: 'Sync config successfully' });
        }
        return res.status(400).json({ message: 'Sync config failed' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sync config failed' });
    }
});

router.get('/api/check-sync-config', authenticate, async (req, res) => {
    try {
        let hasChange = await checkSyncConfig();
        return res.status(200).json({ has_change: hasChange });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sync config failed' });
    }
});

router.get('/api/sensor-config/last-id', authenticate, async (req, res) => {
    try {
        const lastId = await getLastSensorIdInConfig();
        console.log("sensor-config/last-id", lastId);
        res.json({ lastSensorId: lastId });
    } catch (err) {
        console.error('Failed to get last sensor ID:', err);
        res.status(500).json({ message: 'Failed to get last sensor ID.' });
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
        const response = await axios.get(MACHINE_200_SERVER_URL + "/machine_data");
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

let MACHINES_DATA = [];
let MACHINE_TIME_SERVER;
await initMachines();

async function updateMachinesData() {
    let data = await getMachineData();
    if (Object.keys(data).length == 0) return false;
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
    try {
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
        MACHINES_DATA = machines;
        return true;
    }
    catch (e) {
        return false;
    }
}

async function syncMachinesConfig() {
    let success1 = await initMachines();
    let success2 = await syncMachines200ServerConfig();
    return success1 && success2;
}

async function syncMachines200ServerConfig() {
    try {
        const response = await axios.put(MACHINE_200_SERVER_URL + "/sync_machine_config");
        if (response.status == 200) {
            return true;
        }
        return false;
    } catch (error) {
        //console.error('Error fetching machine data:', error);
        return false;
    }
}

function simplify(config) {
    return config.map(({ sensor_id, machine_id, line }) => ({
        sensor_id,
        machine_id,
        line
    }));
}

function areConfigsEqual(a, b) {
    if (a.length !== b.length) return false;

    const sortAndStringify = (arr) =>
        JSON.stringify([...arr].sort((x, y) => x.sensor_id.localeCompare(y.sensor_id)));

    return sortAndStringify(simplify(a)) === sortAndStringify(simplify(b));
}

async function checkSyncConfig() {
    try {
        const currentConfig = await getListMachines();  // DB config
        const config1 = MACHINES_DATA;
        const data = await getMachineData(); 
        if(!data || !data.machine_states) return false;
        const config2 = Object.values(data.machine_states);

        const match1 = areConfigsEqual(currentConfig, config1);
        const match2 = areConfigsEqual(currentConfig, config2);

        console.log("checkSyncConfig", match1, match2);

        if (!match1 || !match2) {
            return true;
        }

        return false;

    } catch (error) {
        console.error("Error checking config sync:", error);
        return false;
    }
}

export default router;