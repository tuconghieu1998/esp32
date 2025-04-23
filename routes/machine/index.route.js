import express from 'express';
var router = express.Router();
import expressWs from 'express-ws';
import { authenticate } from '../../middlewares/middleware.js';
import { WebSocketServer } from 'ws';
expressWs(router); // Enable WebSocket support on this router

const DELAY_SEND_WS = 5000; 
const clients = new Set();

router.get('/', authenticate, (req, res, next) => {
    res.render('machine');
});

router.get('/ws2', authenticate, (req, res, next) => {
    res.render('machine/workshop2.hbs');
});



// WebSocket route for machine data
router.ws('/socket/ws2', (ws, req) => {
    console.log('WebSocket client connected');
    clients.add(ws);

    ws.on('close', () => {
        console.log('Client disconnected');
        clients.delete(ws);
    });
});

// Function to simulate and broadcast machine data
function broadcastMachineData() {
    const machines = generateMachines(200);

    const data = JSON.stringify(machines);

    for (const client of clients) {
        if (client.readyState === 1) {
            client.send(data);
        }
    }
}

// Periodically broadcast data
setInterval(broadcastMachineData, DELAY_SEND_WS);

// Generate 200 machine objects for simulation
function generateMachines(num) {
    const numberOfMachines = num;
    const lines = 5; // e.g. 5 lines
    const statuses = ['running', 'stopped', 'maintenance'];

    function getRandomStatus() {
        return statuses[Math.floor(Math.random() * statuses.length)];
    }

    let machines = Array.from({ length: numberOfMachines }, (_, i) => ({
        id: i + 1,
        status: statuses[0],
        line: Math.floor(i / (numberOfMachines / lines)) + 1,
        temperature: (Math.random() * 40 + 20).toFixed(1) + '°C',
        vibration: (Math.random() * 3).toFixed(2) + ' mm/s',
        uptime: Math.floor(Math.random() * 1000) + ' hrs'
    }));

    machines[15].status = statuses[2];
    machines[11].status = statuses[1];
    machines[10].status = statuses[1];

    return machines;
}

export default router;