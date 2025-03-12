import express, { urlencoded } from 'express';
import { engine } from 'express-handlebars';
import exphbs from 'express-handlebars';
import path from 'path';
import { fileURLToPath } from "url";
import rtspRelay from 'rtsp-relay';
import https from 'https';
import fs from 'fs';
import dotenv from 'dotenv';


dotenv.config();
// const key = fs.readFileSync('./privatekey.pem', 'utf8');
// const cert = fs.readFileSync('./fullchain.pem', 'utf8');
// const ca = fs.readFileSync('./chain.pem', 'utf8'); // required for iOS 15+

const RTSP_USER = process.env.RTSP_USER;
const RTSP_PASS = encodeURIComponent(process.env.RTSP_PASS); // encode special characters
const PORT = process.env.PORT || 10000;
const HOST = "0.0.0.0"; // Allows access from any IP

const app = express();

//const server = https.createServer({ key, cert, ca }, app);
// const { proxy, scriptUrl } = rtspRelay(app, server);
const server = app.listen(PORT, HOST, (error) =>{
    if(!error)
        console.log("Server is Successfully Running, and App is listening on port "+ PORT)
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
app.engine("hbs",engine({
    defaultLayout: 'main.hbs',
    layoutsDir: 'views/_layouts',
    helpers: {
        increment: function (index) {
            return index + 1; // Convert 0-based index to 1-based
        },
        add: (a, b) => a + b,
        subtract: (a, b) => a - b,
        eq: (a, b) => a === b,
        gt: (a, b) => a > b,
        lt: (a, b) => a < b,
        range: (start, end) => {
            return Array.from({ length: end - start + 1 }, (_, i) => start + i);
        }
    }
}));

app.set('views', './views');

import dashboardRoute from './routes/dashboard/index.route.js'
app.use('/', dashboardRoute);

import sensorsRoute from './routes/sensors/index.route.js'
app.use('/sensors', sensorsRoute);

import cameraRoute from './routes/camera/index.route.js'
app.use('/camera', cameraRoute);


app.get('/', (req, res)=>{
    res.status(200);
    res.send("Welcome to root URL of Server");
});

app.get('/hello', (req, res)=>{
    res.set('Content-Type', 'text/html');
    res.status(200).send("<h1>Hello GFG Learner!</h1>");
});

app.post('/', (req, res)=>{
    const {name} = req.body;
    
    res.send(`Welcome ${name}`);
})

