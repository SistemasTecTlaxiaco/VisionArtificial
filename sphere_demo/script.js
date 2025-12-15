// Setup global variables
const videoElement = document.querySelector('.input_video');
const canvasElement = document.getElementById('output_canvas');
const loadingElement = document.getElementById('loading');
const statusElement = document.querySelector('.status');
const cursor1 = document.getElementById('hand-cursor-1');
const cursor2 = document.getElementById('hand-cursor-2');

// Three.js variables
let scene, camera, renderer;
let particles, geometry, material;
let targetScale = 1;
let currentScale = 1;
let time = 0;
// Rotational variables
let targetRotationY = 0;
let targetRotationZ = 0;
let currentRotationY = 0;
let currentRotationZ = 0;

// Initialize Three.js Scene
function initThree() {
    scene = new THREE.Scene();

    // Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 30;

    // Renderer setup
    renderer = new THREE.WebGLRenderer({
        canvas: canvasElement,
        alpha: true,
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    createParticles();

    // Start animation loop
    animate();
}

// Generate a soft glow texture dynamically
function getParticleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.2)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 32, 32);
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

function createParticles() {
    const particleCount = 5000; // Reduced for clarity
    geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    const baseColor = new THREE.Color(0x00ffff); // Pure Cyan

    for (let i = 0; i < particleCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const radius = 10 + (Math.random() - 0.5) * 0.2; // Tighter shell

        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);

        positions.push(x, y, z);

        colors.push(baseColor.r, baseColor.g, baseColor.b);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    material = new THREE.PointsMaterial({
        size: 0.1, // Very small sharp points
        vertexColors: true,
        transparent: false, // Solid points
        blending: THREE.NormalBlending, // No glow effect
        sizeAttenuation: true
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);
}

function animate() {
    requestAnimationFrame(animate);
    time += 0.005;

    // Smooth physics (Increased lerp from 0.03 to 0.1 for more fluidity/responsiveness)
    currentScale += (targetScale - currentScale) * 0.1;
    currentRotationY += (targetRotationY - currentRotationY) * 0.1;
    currentRotationZ += (targetRotationZ - currentRotationZ) * 0.1;

    if (particles) {
        particles.scale.set(currentScale, currentScale, currentScale);

        // Base auto-rotation + Hand controlled rotation
        // time * 0.1 keeps a tiny bit of life even when still
        particles.rotation.y = (time * 0.1) + currentRotationY;
        particles.rotation.z = currentRotationZ;

        // Dynamic Color logic
        const t = Math.max(0, Math.min(1, (currentScale - 0.5) / 6));
        const c1 = new THREE.Color(0x00ffff); // Cyan
        const c2 = new THREE.Color(0x9d00ff); // Purple
        const c3 = new THREE.Color(0xffaa00); // Gold

        let finalColor;
        if (t < 0.5) finalColor = c1.clone().lerp(c2, t * 2);
        else finalColor = c2.clone().lerp(c3, (t - 0.5) * 2);

        particles.material.color = finalColor;
    }

    // Zoom/Opacity logic
    if (currentScale > 4) {
        material.opacity = Math.max(0.0, 1 - (currentScale - 4) * 0.2);
        material.size = 0.5 * (1 + (currentScale - 4) * 0.5);
    } else {
        material.opacity = 0.9;
        material.size = 0.5;
    }

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- MediaPipe Hands Setup ---

function onResults(results) {
    if (loadingElement.style.display !== 'none') {
        loadingElement.style.display = 'none';
    }

    // Hide cursors by default
    cursor1.style.display = 'none';
    cursor2.style.display = 'none';

    // Update cursors
    if (results.multiHandLandmarks) {
        results.multiHandLandmarks.forEach((landmarks, index) => {
            const cursor = index === 0 ? cursor1 : cursor2;
            const tip = landmarks[8];
            const x = (1 - tip.x) * window.innerWidth;
            const y = tip.y * window.innerHeight;
            cursor.style.left = `${x}px`;
            cursor.style.top = `${y}px`;
            cursor.style.display = 'block';
        });
    }

    if (results.multiHandLandmarks && results.multiHandLandmarks.length === 2) {

        const hand1 = results.multiHandLandmarks[0];
        const hand2 = results.multiHandLandmarks[1];
        const p1 = hand1[8];
        const p2 = hand2[8];

        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Normalize distance
        const minDist = 0.05;
        const maxDist = 0.6;
        const normalized = Math.max(0, Math.min(1, (distance - minDist) / (maxDist - minDist)));

        targetScale = 0.5 + Math.pow(normalized, 1.2) * 5.5;

        const percent = Math.round(normalized * 100);
        statusElement.innerText = `Zoom: ${percent}% (Distancia: ${distance.toFixed(2)})`;
        statusElement.style.color = "#00ffff";

        targetRotationY = 0;
        targetRotationZ = 0;

    } else if (results.multiHandLandmarks && results.multiHandLandmarks.length === 1) {
        statusElement.innerText = "✋ 1 Mano Detectada. ¡Usa la otra también!";
        statusElement.style.color = "#ffaa00";
    } else {
        statusElement.innerText = "Esperando manos...";
        statusElement.style.color = "#aaaaaa";
    }
}

const hands = new Hands({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }
});

hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 0, // Lite model for better performance
    minDetectionConfidence: 0.3,
    minTrackingConfidence: 0.3
});

hands.onResults(onResults);

const cameraUtils = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({ image: videoElement });
    },
    width: 640,
    height: 480
});

initThree();
cameraUtils.start().catch(err => {
    console.error("Error:", err);
    loadingElement.innerHTML = "<h1>Error de Cámara</h1>";
});
