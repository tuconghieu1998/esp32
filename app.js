import express from 'express';
import { engine } from 'express-handlebars';
import path from 'path';

const app = express();
const PORT = 3000;

app.use('/', express.static(path.join(process.cwd(), 'public')));
app.use(express.json());

app.set('view engine', 'hbs');  
app.engine("hbs", engine({
    defaultLayout: 'main.hbs',
    layoutsDir: 'views/_layouts',
}));

app.set('views', './views');

import dashboardRoute from './routes/dashboard/index.route.js'
app.use('/', dashboardRoute);


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