import express from 'express';
var router = express.Router();
import { authenticate } from '../../middlewares/middleware.js';
import { WebSocketServer } from 'ws';

router.get('/', authenticate, (req, res, next) => {
    res.render('machine');
});

router.get('/ws2', authenticate, (req, res, next) => {
    res.render('machine/workshop2.hbs');
});


const wss = new WebSocketServer({ port: 8080 });

// Generate 200 machine objects for simulation
function generateMachines(num) {
    const numberOfMachines = 200;
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

const DELAY_SEND_WS = 5000; 

wss.on('connection', ws => {
    console.log('Client connected');

    // Send data every 5 seconds to simulate real-time updates
    setInterval(() => {
        const machines = generateMachines(200); // Generate 200 machines
        ws.send(JSON.stringify(machines)); // Send machine data as JSON
    }, DELAY_SEND_WS); // Update interval (every 5 seconds)
});

export default router;