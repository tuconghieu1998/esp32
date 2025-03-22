function createGradientRGB(ctx, color) {
    let gradient = ctx.createLinearGradient(0, 0, 0, 225);
    gradient.addColorStop(0, color.replace("rgb", "rgba").replace(")", ", 0.6)")); // Semi-transparent at top
    gradient.addColorStop(1, color.replace("rgb", "rgba").replace(")", ", 0)"));   // Fully transparent at bottom
    return gradient;
}

function createGradientRBGA(ctx, color) {
    let gradient = ctx.createLinearGradient(0, 0, 0, 225);
    gradient.addColorStop(0, color.replace("1)", "0.5)")); // Lighter at top
    gradient.addColorStop(1, color.replace("1)", "0)"));   // Fade out at bottom
    return gradient;
}

function createSensorDataLineChart(chartID, labels = [], temperatures = [], humidities = [], sounds = [], lights = []) {
    let chartElement = document.getElementById(chartID);
    let ctx = chartElement.getContext("2d");

    // Generate unique gradients for each dataset
    let tempGradient = createGradientRBGA(ctx, "rgba(255, 0, 0, 1)");     // Red
    let humidityGradient = createGradientRBGA(ctx, "rgba(0, 0, 255, 1)"); // Blue
    let soundGradient = createGradientRBGA(ctx, "rgba(255, 165, 0, 1)");  // Orange
    let lightGradient = createGradientRBGA(ctx, "rgba(255, 215, 0, 1)");  // Gold

    let sensorChart = new Chart(chartElement, {
        type: "line",
        data: {
            labels: labels, // Time labels
            datasets: [
                {
                    label: "Temperature (°C)",
                    fill: true,
                    backgroundColor: tempGradient,
                    borderColor: "red",
                    data: temperatures
                },
                {
                    label: "Humidity (%)",
                    fill: true,
                    backgroundColor: humidityGradient,
                    borderColor: "blue",
                    data: humidities
                },
                {
                    label: "Sound (dB)",
                    fill: true,
                    backgroundColor: soundGradient,
                    borderColor: "orange",
                    data: sounds
                },
                {
                    label: "Light (Lux)",
                    fill: true,
                    backgroundColor: lightGradient,
                    borderColor: "#FFD700", // Gold for better visibility
                    data: lights
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true, // Show legend
                    position: "top"
                },
                tooltip: {
                    intersect: false,
                    mode: "index"
                }
            },
            scales: {
                x: {
                    reverse: true,
                    grid: {
                        color: "rgba(0,0,0,0.0)"
                    },
                    title: {
                        display: true,
                        text: "Time"
                    }
                },
                y: {
                    ticks: {
                        stepSize: 1000 // Adjust based on your data
                    },
                    grid: {
                        borderDash: [3, 3],
                        color: "rgba(0,0,0,0.1)"
                    },
                    title: {
                        display: true,
                        text: "Sensor Values"
                    }
                }
            }
        }
    });
    return sensorChart;
}

function createFactoryLineChart(chartID, labels = [], F1 = [], F2 = [], F3 = [], F4 = []) {
    let chartElement = document.getElementById(chartID);
    let ctx = chartElement.getContext("2d");

    // Generate unique gradients for each dataset
    let f1Gradient = createGradientRGB(ctx, "rgb(255, 61, 103)");
    let f2Gradient = createGradientRGB(ctx, "rgb(54, 162, 235)");
    let f3Gradient = createGradientRGB(ctx, "rgb(75, 192, 192)");
    let f4Gradient = createGradientRGB(ctx, "rgb(255, 159, 64)");

    let sensorChart = new Chart(chartElement, {
        type: "line",
        data: {
            labels: labels, // Time labels
            datasets: [
                {
                    label: "Workshop 1",
                    fill: true,
                    backgroundColor: f1Gradient,
                    borderColor: "#FF3D67",
                    data: F1
                },
                {
                    label: "Workshop 2",
                    fill: true,
                    backgroundColor: f2Gradient,
                    borderColor: "#36A2EB",
                    data: F2
                },
                {
                    label: "Workshop 3",
                    fill: true,
                    backgroundColor: f3Gradient,
                    borderColor: "#4BC0C0",
                    data: F3
                },
                {
                    label: "Workshop 4",
                    fill: true,
                    backgroundColor: f4Gradient,
                    borderColor: "#FF9F40", // Gold for better visibility
                    data: F4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true, // Show legend
                    position: "top"
                },
                tooltip: {
                    intersect: false,
                    mode: "index"
                }
            },
            scales: {
                x: {
                    reverse: true,
                    grid: {
                        color: "rgba(0,0,0,0.0)"
                    },
                    title: {
                        display: true,
                        text: "Time"
                    }
                },
                y: {
                    ticks: {
                        stepSize: 10 // Adjust based on your data
                    },
                    min: 0,   // Set minimum Y value
                    max: 100,  // Set maximum Y value
                    grid: {
                        borderDash: [3, 3],
                        color: "rgba(0,0,0,0.1)"
                    },
                    title: {
                        display: true,
                        text: "Sensor Values"
                    }
                }
            }
        }
    });
    return sensorChart;
}