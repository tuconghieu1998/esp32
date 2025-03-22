import moment from "moment-timezone";
import ExcelJS from 'exceljs';

export const formatTimestamp = (date) => {
    return moment.utc(date).format("HH:mm:ss DD/MM/YYYY");
};

export const convertDateFormat = (dateStr) => {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
}

export const createWorkBookSensorData = (data) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Data");

    // Define columns
    worksheet.columns = [
        { header: "", key: "id", width: 10 },
        { header: "Sensor ID", key: "sensor_id", width: 10 },
        { header: "Factory", key: "factory", width: 15 },
        { header: "Location", key: "location", width: 15 },
        { header: "Temperature (°C)", key: "temperature", width: 15 },
        { header: "Humidity (%)", key: "humidity", width: 15 },
        { header: "Sound (dB)", key: "sound", width: 10 },
        { header: "Light (Lux)", key: "light", width: 10 },
        { header: "Timestamp", key: "timestamp", width: 20 },
    ];

    // Add rows
    data.forEach((row) => worksheet.addRow(row));

    return workbook;
};

export const sendResponseExcelDownload = async(res, workbook, filename = 'data.xlsx') => {
    // Set response headers
    res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);

    // Send Excel file
    await workbook.xlsx.write(res);  
    res.end();
}