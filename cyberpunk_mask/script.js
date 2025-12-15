const videoElement = document.querySelector('.input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');

function onResults(results) {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // Draw the video frame
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    // Darken the real world slightly to make AR pop
    canvasCtx.fillStyle = 'rgba(0, 10, 20, 0.6)';
    canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);

    if (results.multiFaceLandmarks) {
        for (const landmarks of results.multiFaceLandmarks) {

            // 1. Tech Grid on Face
            drawConnectors(canvasCtx, landmarks, FACEMESH_TESSELATION,
                { color: 'rgba(0, 255, 255, 0.1)', lineWidth: 1 });

            // 2. Glowing Eyes (Terminator / Cyber style)
            // Left Eye Iris: 468, Right Eye Iris: 473
            const leftEye = landmarks[468];
            const rightEye = landmarks[473];

            drawGlowingEye(leftEye);
            drawGlowingEye(rightEye);

            // 3. Digital Jaw / Chin Line
            // Silhouette
            drawConnectors(canvasCtx, landmarks, FACEMESH_FACE_OVAL,
                { color: '#ff0055', lineWidth: 4 });

            // 4. Data Points on Cheeks
            // Cheek locations roughly
            drawDataPoint(landmarks[50]); // Cheek
            drawDataPoint(landmarks[280]); // Cheek

            // 5. Forehead HUD element
            const forehead = landmarks[10];
            drawHUDElement(forehead);
        }
    }

    // Add CRT Scanline effect (subtle)
    // canvasCtx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    // ...

    canvasCtx.restore();
}

function drawGlowingEye(landmark) {
    if (!landmark) return;
    const x = landmark.x * canvasElement.width;
    const y = landmark.y * canvasElement.height;

    // Glow
    const gradient = canvasCtx.createRadialGradient(x, y, 2, x, y, 30);
    gradient.addColorStop(0, 'rgba(0, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(0, 255, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');

    canvasCtx.fillStyle = gradient;
    canvasCtx.beginPath();
    canvasCtx.arc(x, y, 30, 0, 2 * Math.PI);
    canvasCtx.fill();

    // Solid Center
    canvasCtx.fillStyle = '#ffffff';
    canvasCtx.beginPath();
    canvasCtx.arc(x, y, 5, 0, 2 * Math.PI);
    canvasCtx.fill();
}

function drawDataPoint(landmark) {
    if (!landmark) return;
    const x = landmark.x * canvasElement.width;
    const y = landmark.y * canvasElement.height;

    canvasCtx.fillStyle = '#ff0055';
    canvasCtx.beginPath();
    canvasCtx.arc(x, y, 3, 0, 2 * Math.PI);
    canvasCtx.fill();

    // Tech Line
    canvasCtx.strokeStyle = '#ff0055';
    canvasCtx.lineWidth = 2;
    canvasCtx.beginPath();
    canvasCtx.moveTo(x, y);
    canvasCtx.lineTo(x + 30, y - 20); // Just a fixed line sticking out
    canvasCtx.lineTo(x + 60, y - 20);
    canvasCtx.stroke();

    canvasCtx.fillStyle = '#ffffff';
    canvasCtx.font = '10px Courier New';
    canvasCtx.fillText("DATA_" + Math.floor(Math.random() * 99), x + 62, y - 22);
}

function drawHUDElement(landmark) {
    if (!landmark) return;
    const x = landmark.x * canvasElement.width;
    const y = landmark.y * canvasElement.height;

    // Triangle pointing down
    canvasCtx.strokeStyle = '#00ffaa';
    canvasCtx.lineWidth = 2;
    canvasCtx.beginPath();
    canvasCtx.moveTo(x - 20, y - 40);
    canvasCtx.lineTo(x + 20, y - 40);
    canvasCtx.lineTo(x, y - 10);
    canvasCtx.closePath();
    canvasCtx.stroke();
}

const faceMesh = new FaceMesh({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
    }
});

faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true, // Crucial for Iris detection (eyes)
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});
faceMesh.onResults(onResults);

const camera = new Camera(videoElement, {
    onFrame: async () => {
        await faceMesh.send({ image: videoElement });
    },
    width: 1280,
    height: 720
});
camera.start();

// Resize handling
window.addEventListener('resize', () => {
    // Optional: Handle resize logic if full screen
    canvasElement.width = window.innerWidth;
    canvasElement.height = window.innerHeight;
});
canvasElement.width = 1280;
canvasElement.height = 720;
