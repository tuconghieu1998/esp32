import express from 'express';
var router = express.Router();
import expressWs from 'express-ws';
import { authenticate } from '../../middlewares/middleware.js';
import { WebSocketServer } from 'ws';
expressWs(router); // Enable WebSocket support on this router
import axios from 'axios';
import { getHoursMachineWorkingByStatus, getListMachines, getTimeLineMachineWorking, getTimeMachineRunningInMonth } from '../../models/machine.model.js';
import moment from 'moment';
import { convertDateFormat } from '../../utils/helpers.js';

const DELAY_SEND_WS = 1000;
const clients = new Set();
const MACHINE_200_SERVER_URL = process.env.MACHINE_200_SERVER_URL;

router.get('/', authenticate, (req, res, next) => {
    res.render('machine');
});

router.get('/ws2', authenticate, async (req, res, next) => {
    let machines = MACHINES_DATA;
    res.render('machine/workshop2.hbs', {
        machines
    });
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
    const machine_id = req.params.machine_id;
    const date = getCurrentDate();
    const {
        percentRunning,
        timeRunning,
        timeStopped,
        timeDisconnected,
        timeChangeOver
    } = await getMachineWorkingTimeByStatus(machine_id, date);
    res.render('machine/machine_dashboard.hbs', { machine_id, percentRunning, timeRunning, timeStopped, timeChangeOver, timeDisconnected });
});

router.get("/api/machine-dashboard", async (req, res) => {
    let { machine_id, date } = req.query;
    let dateFormat = new Date().toISOString().split('T')[0];
    if (date && date != '') {
        dateFormat = convertDateFormat(date);
    }
    const workingTime = await getMachineWorkingTimeByStatus(machine_id, dateFormat);
    res.json({
        workingTime
    });
});

router.get("/api/machine-timeline", async (req, res) => {
    let { machine_id, date } = req.query;
    let dateFormat = new Date().toISOString().split('T')[0];
    if (date && date != '') {
        dateFormat = convertDateFormat(date);
    }
    const data = await getTimeLineMachineWorking(machine_id, dateFormat);
    res.json({
        data
    });
});

router.get("/api/machine-month", async (req, res) => {
    let { machine_id, date } = req.query;
    let dateFormat = new Date().toISOString().split('T')[0];
    if (date && date != '') {
        dateFormat = convertDateFormat(date);
    }
    const data = await getTimeMachineRunningInMonth(machine_id, dateFormat);
    res.json({
        data
    });
});

router.get('/workshop-dashboard', authenticate, async (req, res, next) => {
    res.render('machine/workshop_dashboard.hbs');
});

router.get('/machine-config', authenticate, async (req, res, next) => {
    res.render('machine/machine_config.hbs');
});

function getCurrentDate() {
    return moment().format('YYYY-MM-DD');
}

function getCurrentTime() {
    return moment().format('YYYY-MM-DD HH:mm:ss');
}


// WebSocket route for machine data
router.ws('/socket/ws2', (ws, req) => {
    console.log('WebSocket client connected');
    clients.add(ws);

    ws.on('close', () => {
        console.log('Client disconnected');
        clients.delete(ws);
    });
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
        return [];
    } catch (error) {
        //console.error('Error fetching machine data:', error);
        return [];
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
}

// Periodically broadcast data
setInterval(broadcastMachineData, DELAY_SEND_WS);

let MACHINES_DATA = await initMachines();
let MACHINE_TIME_SERVER;

async function updateMachinesData() {
    let data = await getMachineData();
    let machines = data.machine_states;
    MACHINE_TIME_SERVER = data.current_time;
    if (machines.length == 0) return false;
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