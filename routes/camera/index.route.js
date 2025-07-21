import express from 'express';

import { authenticate, authenticateWebSocket } from '../../middlewares/middleware.js';
import dotenv from 'dotenv';
import ping from 'ping';

dotenv.config();

const RTSP_USER = process.env.RTSP_USER;
const RTSP_PASS = encodeURIComponent(process.env.RTSP_PASS); // encode special characters


export default function cameraRouter({ proxy, scriptUrl }) {
    var router = express.Router();
    const activeStreams = new Map(); // Store active FFmpeg processes

    router.get('/', authenticate, (req, res, next) => {
        res.render('camera');
    });

    router.get('/workshop1', authenticate, (req, res, next) => {
        res.render('camera/workshop1.hbs');
    });

    router.get('/workshop2', authenticate, (req, res, next) => {
        res.render('camera/workshop2.hbs');
    });

    router.get('/workshop3', authenticate, (req, res, next) => {
        res.render('camera/workshop3.hbs');
    });

    router.get('/workshop4', authenticate, (req, res, next) => {
        res.render('camera/workshop4.hbs');
    });

    router.ws('/stream/:cameraIP', (ws, req) => {
        console.log("/api/stream/:cameraIP");
        authenticateWebSocket(ws, req, () => {
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
    router.post('/check-ping', async (req, res) => {
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

    return router;

}