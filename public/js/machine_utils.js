function getTodayFormatted() {
    const today = new Date();
    const yyyy = today.getFullYear();
    let mm = today.getMonth() + 1; // Months start at 0!
    let dd = today.getDate();

    if (dd < 10) dd = '0' + dd;
    if (mm < 10) mm = '0' + mm;

    return dd + '/' + mm + '/' + yyyy;
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const yyyy = date.getFullYear();
    let mm = date.getMonth() + 1; // Months start at 0!
    let dd = date.getDate();

    if (dd < 10) dd = '0' + dd;
    if (mm < 10) mm = '0' + mm;

    return dd + '/' + mm + '/' + yyyy;
}

function getCurrentMonth() {
    const today = new Date();
    return today.getMonth() + 1;
}

function getCurrentYear() {
    const today = new Date();
    return today.getFullYear();
}

function formatMachineId(id) {
    return '#' + String(id).padStart(3, '0');
}

function convertMachineId(machineIdStr) {
    machineIdStr = machineIdStr.replace('#', '');
    if (isNaN(Number(machineIdStr))) {
        alert("Machine ID invalid!");
        return '';
    }
    return Number(machineIdStr);
}

function convertDecimalHoursToTime(decimalHours) {
    decimalHours = String(decimalHours).replaceAll(',', '');
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

function convertHoursToHHMM(decimalHours) {
    decimalHours = String(decimalHours).replaceAll(',', '');
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    return `${hours}h${minutes.toString().padStart(2, '0')}m`;
}

// format dd/mm/yyyy
function getMaxPercentPassedToday(fromDateStr, toDateStr) {
    // Expecting format 'dd/mm/yyyy'
    const [fromDay, fromMonth, fromYear] = fromDateStr.split('/').map(Number);
    const [day, month, year] = toDateStr.split('/').map(Number);
    const fromDate = new Date(fromYear, fromMonth - 1, fromDay);
    const target = new Date(year, month - 1, day); // month is 0-based

    const diffMilliseconds = target.getTime() - fromDate.getTime();

    const now = new Date();
    const secondsPerDay = 86400;

    const isToday =
        target.getFullYear() === now.getFullYear() &&
        target.getMonth() === now.getMonth() &&
        target.getDate() === now.getDate();

    if (isToday) {
        const secondsSinceMidnight =
            now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
        const percent = ((diffMilliseconds/1000 + secondsSinceMidnight) / (diffMilliseconds/1000 + secondsPerDay)) * 100;
        return percent.toFixed(2);
    } else {
        return "100.00";
    }
}