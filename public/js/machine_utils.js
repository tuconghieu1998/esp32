function getTodayFormatted() {
    const today = new Date();
    const yyyy = today.getFullYear();
    let mm = today.getMonth() + 1; // Months start at 0!
    let dd = today.getDate();

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
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
}