import express, { urlencoded } from 'express';
import { engine } from 'express-handlebars';
import exphbs from 'express-handlebars';
import path from 'path';
import { fileURLToPath } from "url";
import rtspRelay from 'rtsp-relay';
import https from 'https';
import fs from 'fs';
import dotenv from 'dotenv';
import ping from 'ping';

dotenv.config();
// const key = fs.readFileSync('./privatekey.pem', 'utf8');
// const cert = fs.readFileSync('./fullchain.pem', 'utf8');
// const ca = fs.readFileSync('./chain.pem', 'utf8'); // required for iOS 15+

const RTSP_USER = process.env.RTSP_USER;
const RTSP_PASS = encodeURIComponent(process.env.RTSP_PASS); // encode special characters
const PORT = process.env.PORT || 10000;
const HOST = "0.0.0.0"; // Allows access from any IP


const app = express();

app.use(express.static('public'));

//const server = https.createServer({ key, cert, ca }, app);
// const { proxy, scriptUrl } = rtspRelay(app, server);
const server = app.listen(PORT, HOST, (error) => {
    if (!error)
        console.log("Server is Successfully Running, and App is listening on port " + PORT)
    else
        console.log("Error occurred, server can't start", error);
}
);

const { proxy, scriptUrl } = rtspRelay(app, server);

const activeStreams = new Map(); // Store active FFmpeg processes

app.ws('/api/stream/:cameraIP', (ws, req) => {
    const cameraIP = req.params.cameraIP;
    console.log(`Starting stream for: ${cameraIP}`);

    if (activeStreams.has(cameraIP)) {
        console.log(`Reusing existing stream for: ${cameraIP}`);
        return activeStreams.get(cameraIP)(ws);
    }

    const stream = proxy({
        url: `rtsp://${RTSP_USER}:${RTSP_PASS}@${req.params.cameraIP}/Streaming/Channels/101`,
        transport: 'tcp',
        additionalFlags: ['-q', '1']
    });

    activeStreams.set(cameraIP, stream);

    ws.on('close', () => {
        console.log(`Closing stream for: ${cameraIP}`);
        activeStreams.delete(cameraIP);
    });

    return stream(ws);
});

// this is an example html page to view the stream
app.get('/camera/stream/:cameraIP', (req, res) =>
    res.send(`
  <canvas id='canvas-camera'></canvas>

  <script src='${scriptUrl}'></script>
  <script>
    loadPlayer({
      url: 'ws://' + location.host + '/api/stream/${req.params.cameraIP}',
      canvas: document.getElementById('canvas-camera'),
      wasmMemorySize: 64 * 1024 * 1024, // Increase WebAssembly memory
        disableGl: true, // Fallback to Canvas rendering (helps with frame errors)
        chunkSize: 512 * 1024, // Prevents buffering overflow
        videoBufferSize: 1024*1024*8
    });
    console.log('loaded Player ${req.params.cameraIP}', location.host);
  </script>
`),
);

app.use('/', express.static(path.join(process.cwd(), 'public')));
app.use(express.json());

app.set('view engine', 'hbs');
app.engine("hbs", engine({
    defaultLayout: 'main.hbs',
    layoutsDir: 'views/_layouts',
    helpers: {
        sub: (a, b) => a - b, // Subtract helper
        add: (a, b) => a + b, // Add helper
        eq: (a, b) => a === b, // Equality check
        gt: (a, b) => a > b,   // Greater than check
        lt: (a, b) => a < b,   // Less than check
        max: (a, b) => Math.max(a, b), // Get max value
        min: (a, b) => Math.min(a, b), // Get min value
        range: (start, end) => {
            let result = [];
            for (let i = start; i <= end; i++) {
                result.push(i);
            }
            return result;
        },
        increment: (value) => value + 1, // Increments value by 1
        decrement: (value) => value - 1, // Optional: Decrement helper
    }
}));

app.set('views', './views');

import dashboardRoute from './routes/dashboard/index.route.js'
app.use('/', dashboardRoute);

import sensorsRoute from './routes/sensors/index.route.js'
app.use('/sensors', sensorsRoute);

import cameraRoute from './routes/camera/index.route.js'
import { getConnection } from './db.js';
app.use('/camera', cameraRoute);


app.get('/', (req, res) => {
    res.status(200);
    res.send("Welcome to root URL of Server");
});

app.get('/hello', (req, res) => {
    res.set('Content-Type', 'text/html');
    res.status(200).send("<h1>Hello GFG Learner!</h1>");
});

app.post('/', (req, res) => {
    const { name } = req.body;

    res.send(`Welcome ${name}`);
});

async function checkPing(ip) {
    try {
        const res = await ping.promise.probe(ip, { timeout: 2 });
        return res.alive ? 'Online' : 'Offline';
    } catch (error) {
        return 'Offline';
    }
}

// Route to check multiple IPs
app.post('/check-ping', async (req, res) => {
    const ipAddresses = req.body; // Expecting an array of IPs from the request body

    if (!Array.isArray(ipAddresses)) {
        return res.status(400).json({ error: "Invalid input, expected an array of IPs." });
    }

    try {
        // Use Promise.all() to check all IPs concurrently
        const result = await Promise.all(
            ipAddresses.map(async (ip) => ({
                ip,
                status: await checkPing(ip),
            }))
        );

        return res.json(result);
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

