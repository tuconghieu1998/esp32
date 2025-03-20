import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import express from 'express';
import { getUserByUserName } from '../../models/user_data.model.js';

let router = express.Router();

router.get('/login', (req, res) => {
    return res.render('account/login.hbs', { layout: false });
});

router.post('/auto-login', (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        console.log('auto-login', token);

        const secretKey = process.env.JWT_SECRET;

        if (!token) {
            return res.status(401).json({ success: false, message: "No token provided" });
        }

        jwt.verify(token, secretKey, (err, decoded) => {
            if (err) {
                return res.status(401).json({ success: false, message: "Invalid token" });
            }

            const user = decoded;

            req.session.user = { id: user.id, username: user.username };

            res.json({ success: true, user }); // Send user info if valid
        });
    }
    catch (e) {
        return res.status(401).json({ success: false, message: "Error" });
    }
});

// Login route
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log('/login', username, password);

        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

        const users = await getUserByUserName(username);
        if (users.length == 0) {
            return res.status(401).json({ message: 'Account is not exist!' });
        }
        const user = users[0];

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }
        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '365day' }
        );

        req.session.user = { id: user.id, username: user.username };
        res.status(200).json({ message: 'Login successful', token });
    }
    catch (e) {
        console.error(e);
        return res.status(400).json({ message: "Bad request" });
    }

});

export default router;
