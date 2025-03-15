$(document).ready(function () {
    $(".camera").hover(
        function () {
            $(this).addClass("hover-effect");
        },
        function () {
            $(this).removeClass("hover-effect");
        }
    );
});

function removeAllChildElementsByClass(parent, className) {
    // Selects all descendants of "parent" with the given class
    const elements = parent.querySelectorAll(`.${className}`);
    elements.forEach(el => el.remove());
}

function loadCameras(cameras) {
    let container = document.getElementById('factory-container');
    removeAllChildElementsByClass(container, 'cameraElement');
    for (let key in cameras) {
        container.innerHTML += createCamera({ ...cameras[key], key });
    }
}

function createCamera(camera) {
    if(camera.key == '14.10' || camera.key == '14.11' || camera.key == '14.12') {
        return `<a class="cameraElement" href="javascript:void(0)" onclick="handleCameraClick('${camera.key}')">
                        <div id=${camera.ip} class="camera floor2" style="left: ${camera.position[0]}%; top: ${camera.position[1]}%;" data-id="${camera.key}">
                        <span class="camera-text">${camera.key}</span>
                        </div>
                    </a>`;
    }
    return `<a class="cameraElement" href="javascript:void(0)" onclick="handleCameraClick('${camera.key}')">
                        <div id=${camera.ip} class="camera" style="left: ${camera.position[0]}%; top: ${camera.position[1]}%;" data-id="${camera.key}">
                        <span class="camera-text">${camera.key}</span>
                        </div>
                    </a>`;
}

function handleCameraClick(key) {
    if (cameras[key].status == "Offline") {
        alert("Camera Offline: " + cameras[key].ip); // Show IP if offline
    } else {
        openModal(cameras[key].ip); // Open modal if online
    }
}

function resizeCanvas() {
    const modalBody = document.getElementById('modalBody');
    const canvas = document.getElementById('canvas-camera');
    canvas.width = modalBody.clientWidth;  // Fit modal width
    canvas.height = modalBody.clientHeight; // Fit modal height
}

// Resize on load & window resize
resizeCanvas();
window.addEventListener('resize', resizeCanvas);
window.addEventListener('beforeunload', closeWebSocket);

async function waitForImageLoad(img) {
    if (img.complete && img.naturalWidth !== 0) {
        return; // Image is already loaded
    }
    try {
        await img.decode(); // Wait for image to be fully decoded
    } catch (e) {
        console.warn("Image decode failed, falling back to onload event");
        await new Promise(resolve => (img.onload = resolve));
    }
}

async function adjustCameraPositions() {
    const factoryImage = document.getElementById("factory-layout");
    const cameraElements = document.querySelectorAll(".camera");

    await waitForImageLoad(factoryImage); // Ensure image is loaded

    if (!factoryImage.complete) {
        factoryImage.onload = adjustCameraPositions; // Ensure the function runs after image loads
        return;
    }

    cameraElements.forEach(camera => {
        const dataId = camera.getAttribute("data-id");
        const position = cameras[dataId].position; // Assume cameraPositions is an object storing original positions

        if (factoryImage) {
            const imageWidth = factoryImage.clientWidth;
            const imageHeight = factoryImage.clientHeight;

            const xPos = (position[0] / 100) * imageWidth;
            const yPos = (position[1] / 100) * imageHeight;

            camera.style.left = `${xPos}px`;
            camera.style.top = `${yPos}px`;
        }
    });
}

document.addEventListener("DOMContentLoaded", function () {
    const factoryImage = document.getElementById("factory-layout");

    // Run after image is loaded
    if (factoryImage.complete) {
        adjustCameraPositions();
    } else {
        factoryImage.onload = adjustCameraPositions;
    }

    // Update positions when window resizes
    window.addEventListener("load", adjustCameraPositions);
    window.addEventListener("resize", adjustCameraPositions);
});

let socket = null; // Store WebSocket instance globally

function closeWebSocket() {
    console.log("closeWebSocket");
    if (socket) {
        console.log("close");
        socket.destroy();
    }
    clearCanvas();
}

function clearCanvas() {
    const canvas = document.getElementById('canvas-camera');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = "grey"; // Set background color
        ctx.fillRect(0, 0, canvas.width, canvas.height); // Fill entire canvas
        console.log("🧹 Canvas Cleared & Reset to Black!");
    }
}

async function openModal(cameraIP) {
    console.log('openModal', cameraIP);
    try {
        clearCanvas();

        const canvas = document.getElementById('canvas-camera');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        socket = await loadPlayer({
            url: `ws://${location.host}/api/stream/${cameraIP}`,
            canvas: canvas,
            wasmMemorySize: 64 * 1024 * 1024,
            disableGl: true,
            chunkSize: 512 * 1024,
            videoBufferSize: 1024 * 1024 * 8
        });

        console.log('🎥 Player loaded:', cameraIP);

        // Show the modal
        let modal = new bootstrap.Modal(document.getElementById("cameraModal"));
        modal.show();

        // Close WebSocket when modal is hidden
        document.getElementById("cameraModal").addEventListener("hidden.bs.modal", closeWebSocket);
    } catch (error) {
        console.error('❌ Failed to load player:', error);
    }
}

$(document).ready(function () {
    const ipAddresses = [];
    for(let key in cameras) {
        ipAddresses.push(cameras[key].ip);
    }

    $.ajax({
        url: `http://${location.host}/check-ping`,
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify(ipAddresses),
        success: function (response) {
            for (let ping of response) {
                let element = document.getElementById(ping.ip);
                //set status
                for(let key in cameras) {
                    if(cameras[key].ip == ping.ip){
                        cameras[key].status = ping.status;
                    }
                }
    
                if (element) { // Ensure element exists
                    element.classList.remove("ip-online");
                    element.classList.remove("ip-offline");
                    if (ping.status === "Online") {
                        element.classList.add("ip-online");
                    } else {
                        element.classList.add("ip-offline"); // ✅ Adds class
                    }
                } else {
                    console.warn("Element not found:", ping.ip);
                }
            }
        },
        error: function (xhr, status, error) {
            console.error("Error fetching ping results:", error);
        }
    });
  });