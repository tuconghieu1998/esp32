import express, { urlencoded } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import {expressEngine} from './utils/express_engine.js';
import rtspRelay from 'rtsp-relay';

import dashboardRoute from './routes/dashboard/index.route.js';
import sensorsRoute from './routes/sensors/index.route.js';
import cameraRoute from './routes/camera/index.route.js';
import accountRoute from './routes/account/index.route.js';
import machineRoute from './routes/machine/index.route.js';
import { closeConnection } from './db.js';
import { sessionConfig } from './middlewares/middleware.js';

dotenv.config();

const PORT = process.env.PORT || 10000;
const HOST = "0.0.0.0"; // Allows access from any IP


const app = express();

app.use(express.static('public'));

const server = app.listen(PORT, HOST, (error) => {
    if (!error)
        console.log("Server is Successfully Running, and App is listening on port " + PORT)
    else
        console.log("Error occurred, server can't start", error);
}
);

const { proxy, scriptUrl } = rtspRelay(app, server);

app.use('/', express.static(path.join(process.cwd(), 'public')));
app.use(express.json());

app.set('view engine', 'hbs');
app.engine("hbs", expressEngine);

// Session Configuration
app.use(sessionConfig);

app.set('views', './views');
app.use('/', dashboardRoute);
app.use('/sensors', sensorsRoute);
app.use('/camera', cameraRoute({proxy, scriptUrl}));
app.use('/account', accountRoute);
app.use('/machine', machineRoute);
app.get('/mes', (req, res) => {
    res.render('mes', { layout: false });
});

process.on('SIGINT', async () => {
    console.log("Shutting down gracefully...");
    await closeConnection();
    process.exit(0);
});
