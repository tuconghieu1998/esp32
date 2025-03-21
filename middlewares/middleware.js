import jwt from 'jsonwebtoken';
const secretKey = process.env.JWT_SECRET;

export const authenticate = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/account/auto-login');
    }
    next();
};

export const authenticateWebSocket = (ws, req, next) => {
    const params = new URLSearchParams(req.url.split('?')[1]);
    const token = params.get('token'); // Extract token from URL
    console.log('authenticateWebSocket', token);

    if (!token) {
        ws.close(4001, "No token provided"); // Reject if no token
        return;
    }

    jwt.verify(token, secretKey, (err, user) => {
        if (err) {
            ws.close(4002, "Invalid token"); // Reject if invalid token
            return;
        }

        req.user = user; // Attach user data to request
        next(); // Proceed to WebSocket connection
    });
};