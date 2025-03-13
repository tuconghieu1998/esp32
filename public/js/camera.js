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
    console.log(cameras);
    removeAllChildElementsByClass(container, 'cameraElement');
    for (let key in cameras) {
        container.innerHTML += createCamera({ ...cameras[key], key });
    }
}

function createCamera(camera) {
    if(camera.key == '14.10' || camera.key == '14.11' || camera.key == '14.12') {
        return `<a class="cameraElement" href="javascript:void(0)" onclick="openModal('${camera.ip}')">
                        <div class="camera floor2" style="left: ${camera.position[0]}%; top: ${camera.position[1]}%;" data-id="${camera.key}">
                        <span class="camera-text">${camera.key}</span>
                        </div>
                    </a>`;
    }
    return `<a class="cameraElement" href="javascript:void(0)" onclick="openModal('${camera.ip}')">
                        <div class="camera" style="left: ${camera.position[0]}%; top: ${camera.position[1]}%;" data-id="${camera.key}">
                        <span class="camera-text">${camera.key}</span>
                        </div>
                    </a>`;
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