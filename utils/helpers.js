import moment from "moment-timezone";
import ExcelJS from 'exceljs';

export const formatTimestamp = (date) => {
    return moment.utc(date).format("HH:mm:ss DD/MM/YYYY");
};

export const formatToTime = (date) => {
    return moment.utc(date).format("HH:mm:ss");
};

export const formatTimeToDate = (time) => {
    return moment.utc(time).format("DD/MM/YYYY");
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

export const createWorkBookWorkshopData = (data) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Data");

    // Define columns
    worksheet.columns = [
        { header: "", key: "id", width: 10 },
        { header: "Factory", key: "factory", width: 15 },
        { header: "Temperature (°C)", key: "avg_temperature", width: 15 },
        { header: "Humidity (%)", key: "avg_humidity", width: 15 },
        { header: "Sound (dB)", key: "avg_sound", width: 10 },
        { header: "Light (Lux)", key: "avg_light", width: 10 },
        { header: "Time", key: "hour", width: 20 },
        { header: "Date", key: "date", width: 20 },
    ];

    // Add rows
    data.forEach((row) => worksheet.addRow(row));

    return workbook;
};

export const createWorkBookWorkshopReport = (data) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Data");

    // Define columns
    worksheet.columns = [
        { header: "Date", key: "date", width: 15 },
        { header: "Machine ID", key: "machine_id", width: 15 },
        { header: "Line", key: "line", width: 15 },
        { header: "Time Running(h)", key: "running_hours", width: 30 },
        { header: "Time Stopped(h)", key: "stopped_hours", width: 30 },
        { header: "Time Changeover(h)", key: "changeover_hours", width: 30 },
        { header: "Percent Running(%)", key: "percent_running", width: 30 },
        { header: "Percent Stopped(%)", key: "percent_stopped", width: 30 },
        { header: "Percent Changeover(%)", key: "percent_changeover", width: 30 },
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