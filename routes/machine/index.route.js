import express from 'express';
var router = express.Router();
import expressWs from 'express-ws';
import { authenticate } from '../../middlewares/middleware.js';
import { WebSocketServer } from 'ws';
expressWs(router); // Enable WebSocket support on this router
import axios from 'axios';
import { getListMachines } from '../../models/machine.model.js';
import moment from 'moment';

const DELAY_SEND_WS = 5000;
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
        console.error('Error fetching machine data:', error);
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
        if(!updated) return;
        const data = JSON.stringify(MACHINES_DATA);

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

async function updateMachinesData() {
    let machines = await getMachineData();
    if(machines.length == 0) return false;
    for(let i = 0 ;i<MACHINES_DATA.length;i++) {
        let sensor_id = MACHINES_DATA[i].sensor_id; 
        if(machines[sensor_id]) {
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
    for(let i = 0; i<machinesConfig.length; i++) {
        machines.push({
            sensor_id: machinesConfig[i].sensor_id,
            machine_id: machinesConfig[i].machine_id,
            line: machinesConfig[i].line,
            status: 'stopped',
            update_time: currentTime
        });
    }
    return machines;
}

export default router;