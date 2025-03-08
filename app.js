import express from 'express';
import { engine } from 'express-handlebars';
import exphbs from 'express-handlebars';
import path from 'path';

const app = express();
const PORT = 3000;

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

app.listen(PORT, (error) =>{
    if(!error)
        console.log("Server is Successfully Running, and App is listening on port "+ PORT)
    else 
        console.log("Error occurred, server can't start", error);
    }
);