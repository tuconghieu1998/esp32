import { engine } from 'express-handlebars';

export const expressEngine = engine({
    defaultLayout: 'main.hbs',
    layoutsDir: 'views/_layouts',
    helpers: {
        sub: (a, b) => a - b, // Subtract helper
        add: (a, b) => a + b, // Add helper
        eq: (a, b) => a === b, // Equality check
        gt: (a, b) => a > b,   // Greater than check
        lt: (a, b) => a < b,   // Less than check
        max: (a, b) => Math.max(a, b), // Get max value
        min: (a, b) => Math.min(a, b), // Get min value
        range: (start, end) => {
            let result = [];
            for (let i = start; i <= end; i++) {
                result.push(i);
            }
            return result;
        },
        increment: (value) => value + 1, // Increments value by 1
        decrement: (value) => value - 1, // Optional: Decrement helper
        formatMachineId: function (id) {
            return '#' + String(id).padStart(3, '0');
        },
        convertDecimalHoursToTime: function(decimalHours) {
            decimalHours = String(decimalHours).replaceAll(',', '');
            const hours = Math.floor(decimalHours);
            const minutes = Math.round((decimalHours - hours) * 60);
            return `${hours}:${minutes.toString().padStart(2, '0')}`;
        }
    }
});