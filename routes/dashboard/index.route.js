import express from 'express';
var router = express.Router();
import ExcelJS from 'exceljs';

var details = [
    {
      "id": 1,
      "timestamp": "2025-03-06T08:00:00",
      "temperature": 22.5,
      "humidity": 60.2,
      "factory": "Factory 1",
      "location": "Zone1"
    },
    {
      "id": 2,
      "timestamp": "2025-03-07T08:05:00",
      "temperature": 23.1,
      "humidity": 58.7,
      "factory": "Factory 2",
      "location": "Zone2"
    },
    {
      "id": 3,
      "timestamp": "2025-03-07T08:10:00",
      "temperature": 21.8,
      "humidity": 65.0,
      "factory": "Factory 3",
      "location": "Zone3"
    },
    {
      "id": 4,
      "timestamp": "2025-03-07T08:15:00",
      "temperature": 24.2,
      "humidity": 55.3,
      "factory": "Factory 4",
      "location": "Zone4"
    },
    {
      "id": 5,
      "timestamp": "2025-03-07T08:20:00",
      "temperature": 25.0,
      "humidity": 50.5,
      "factory": "Factory 1",
      "location": "Zone1"
    },
    {
      "id": 6,
      "timestamp": "2025-03-07T08:25:00",
      "temperature": 22.9,
      "humidity": 59.8,
      "factory": "Factory 2",
      "location": "Zone2"
    },
    {
      "id": 7,
      "timestamp": "2025-03-07T08:30:00",
      "temperature": 23.5,
      "humidity": 57.6,
      "factory": "Factory 3",
      "location": "Zone3"
    },
    {
      "id": 8,
      "timestamp": "2025-03-07T08:35:00",
      "temperature": 21.2,
      "humidity": 66.3,
      "factory": "Factory 4",
      "location": "Zone4"
    },
    {
      "id": 9,
      "timestamp": "2025-03-07T08:40:00",
      "temperature": 24.8,
      "humidity": 53.1,
      "factory": "Factory 1",
      "location": "Zone1"
    },
    {
      "id": 10,
      "timestamp": "2025-03-07T08:45:00",
      "temperature": 25.5,
      "humidity": 49.7,
      "factory": "Factory 2",
      "location": "Zone2"
    },
    {
      "id": 11,
      "timestamp": "2025-03-07T08:50:00",
      "temperature": 22.0,
      "humidity": 61.0,
      "factory": "Factory 3",
      "location": "Zone3"
    },
    {
      "id": 12,
      "timestamp": "2025-03-07T08:55:00",
      "temperature": 23.8,
      "humidity": 56.9,
      "factory": "Factory 4",
      "location": "Zone4"
    },
    {
      "id": 13,
      "timestamp": "2025-03-07T09:00:00",
      "temperature": 24.1,
      "humidity": 54.5,
      "factory": "Factory 1",
      "location": "Zone1"
    },
    {
      "id": 14,
      "timestamp": "2025-03-07T09:05:00",
      "temperature": 20.9,
      "humidity": 67.2,
      "factory": "Factory 2",
      "location": "Zone2"
    },
    {
      "id": 15,
      "timestamp": "2025-03-07T09:10:00",
      "temperature": 25.2,
      "humidity": 51.7,
      "factory": "Factory 3",
      "location": "Zone3"
    },
    {
      "id": 16,
      "timestamp": "2025-03-07T09:15:00",
      "temperature": 22.7,
      "humidity": 60.1,
      "factory": "Factory 4",
      "location": "Zone4"
    },
    {
      "id": 17,
      "timestamp": "2025-03-07T09:20:00",
      "temperature": 23.3,
      "humidity": 58.2,
      "factory": "Factory 1",
      "location": "Zone1"
    },
    {
      "id": 18,
      "timestamp": "2025-03-07T09:25:00",
      "temperature": 24.6,
      "humidity": 52.9,
      "factory": "Factory 2",
      "location": "Zone2"
    },
    {
      "id": 19,
      "timestamp": "2025-03-07T09:30:00",
      "temperature": 21.5,
      "humidity": 64.4,
      "factory": "Factory 3",
      "location": "Zone3"
    },
    {
      "id": 20,
      "timestamp": "2025-03-07T09:35:00",
      "temperature": 25.8,
      "humidity": 48.9,
      "factory": "Factory 4",
      "location": "Zone4"
    }
  ];
  
  import moment from "moment";

  const formatTimestamp = (date) => {
      return moment(date).format("HH:mm:ss DD/MM/YYYY");
  };

// trang chu
router.get('/', (req, res, next) => {
    var now = new Date();

    res.locals.isHomepage = true;

    res.locals.pageTitle = 'Trang chủ';

    var data = JSON.parse(JSON.stringify(details));

    let page = parseInt(req.query.page) || 1; // Get the current page
    let limit = 10; // Number of items per page
    let startIndex = (page - 1) * limit;
    let endIndex = page * limit;

    let paginatedData = data.slice(startIndex, endIndex); // Slice the data

    data.forEach(detail => {
        detail.timestamp = formatTimestamp(detail.timestamp);
    });

    res.render('dashboard', {
        details: paginatedData,
        currentPage: page,
        totalPages: Math.ceil(details.length / limit),
        limit
    });
});

router.get("/dashboard/filter", (req, res) => {
    let { factory, location, time } = req.query;

    let page = parseInt(req.query.page) || 1; // Get the current page
    let limit = 10; // Number of items per page
    let startIndex = (page - 1) * limit;
    let endIndex = page * limit;

    let filteredData = JSON.parse(JSON.stringify(details));

    // Apply filters if they are selected
    if (factory && factory !== "") {
        filteredData = filteredData.filter(item => item.factory === factory);
    }

    if (location && location !== "") {
        filteredData = filteredData.filter(item => item.location === location);
    }

    if (time && time !== "") {
        filteredData = filteredData.filter(item => {
            let str = moment(item.timestamp).format('DD/MM/yyyy');
            return str == time;
        });
    }

    let paginatedData = filteredData.slice(startIndex, endIndex); // Slice the data

    var data = Array.from(paginatedData);
    data.forEach(detail => {
        detail.timestamp = formatTimestamp(detail.timestamp);
    });

    res.json({ 
      details: data,
      currentPage: page,
      limit,
      totalPages: Math.ceil(details.length / limit)});
});

router.get("/dashboard/export-excel", async (req, res) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Factory Data");

  // Define columns
  worksheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "Factory", key: "factory", width: 15 },
      { header: "Location", key: "location", width: 15 },
      { header: "Temperature (°C)", key: "temperature", width: 15 },
      { header: "Humidity (%)", key: "humidity", width: 15 },
      { header: "Timestamp", key: "timestamp", width: 20 },
  ];

  let sampleData = JSON.parse(JSON.stringify(details));
  // Add rows
  sampleData.forEach((row) => worksheet.addRow(row));

  // Set response headers
  res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", "attachment; filename=data.xlsx");

  // Send Excel file
  await workbook.xlsx.write(res);
  res.end();
});

// Sample sensor data (replace with database query)
function generateSensorData(numSensors = 32) {
  const sensors = [];
  
  for (let i = 1; i <= numSensors; i++) {
      sensors.push({
          sensorId: `sensor${i}`,
          temperature: (Math.random() * (50 - 20) + 20).toFixed(1), // Random temperature between 20°C and 50°C
          humidity: (Math.random() * (80 - 40) + 40).toFixed(1) // Random humidity between 40% and 80%
      });
  }

  return sensors;
}

// Generate 32 sensor data entries
const sensorData = generateSensorData(32);

// API to get sensor data
router.get("/api/sensor-data/:id", (req, res) => {
  const sensorId = req.params.id;
  res.json(sensorData.find(item => item.sensorId == sensorId) || { temperature: "N/A", humidity: "N/A" });
});

// API to get sensor data
router.get("/api/sensor-data", (req, res) => {
  let { factory } = req.query;
  res.json({sensors: sensorData});
});

export default router;