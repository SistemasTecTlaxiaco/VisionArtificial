import * as THREE from 'three';

// --- Configuration ---
const PARTICLE_COUNT = 3000;
const PARTICLE_SIZE = 0.035;
const CAMERA_Z = 6;

// --- Scene Setup ---
const scene = new THREE.Scene();
// Fog to give depth
scene.fog = new THREE.FogExp2(0x050505, 0.08);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = CAMERA_Z;

const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector('#bg-canvas'),
    antialias: true,
    alpha: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// --- Particles System ---
// We will store different "target" positions for each shape.
// shapes: 'sphere', 'brain', 'grid', 'helix'

const particlesGeometry = new THREE.BufferGeometry();
const particlePositions = new Float32Array(PARTICLE_COUNT * 3);

// --- Particle Sphere State (Merged) ---
// Variables from the other project for smooth physics
let targetScale = 1;
let currentScale = 1; // Used for hand control
let targetRotationY = 0;
let targetRotationZ = 0;
let currentRotationY = 0; // Hand induced rotation
let currentRotationZ = 0;
let autoRotationY = 0; // Accumulated auto rotation

// Current positions (displayed)
const currentPositions = new Float32Array(PARTICLE_COUNT * 3);

// Target shapes data
const targets = {
    sphere: [],
    brain: [],
    grid: [],
    helix: []
};

// --- Geometry Generation Helper Functions ---

// 1. Sphere (Random distribution on sphere surface/volume)
function createSpherePositions() {
    const positions = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        const r = 2.5 + (Math.random() * 0.5); // Radius spread

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);
        positions.push(x, y, z);
    }
    return positions;
}

// 2. Brain - roughly 2 hemispheres
function createBrainPositions() {
    const positions = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        // Parametric formulas for a brain-like shape can be complex.
        // We'll approximate with two deformed ellipsoids.
        const isRight = Math.random() > 0.5;
        const xOffset = isRight ? 0.8 : -0.8;

        // Random point in unit sphere
        let u = Math.random();
        let v = Math.random();
        let theta = 2 * Math.PI * u;
        let phi = Math.acos(2 * v - 1);
        let r = 1.3;

        let x = r * Math.sin(phi) * Math.cos(theta);
        let y = r * Math.sin(phi) * Math.sin(theta);
        let z = r * Math.cos(phi);

        // Deform to look more oblong/brainy
        x *= 0.8;
        y *= 0.6;
        z *= 0.9;

        // Apply wiggle for gyri/sulci texture roughly
        x += (Math.sin(y * 10) * 0.1);

        positions.push(x + xOffset, y, z);
    }
    return positions;
}

// 3. Grid / Plane (Matrix style)
function createGridPositions() {
    const positions = [];
    const rows = Math.sqrt(PARTICLE_COUNT);
    const spacing = 0.2;
    const offset = (rows * spacing) / 2;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const col = i % Math.floor(rows);
        const row = Math.floor(i / rows);

        // Perturb z slightly for wave effect
        const x = (col * spacing) - offset;
        const y = (Math.random() - 0.5) * 2; // Random Y height aka 'cloud' or 'plane'
        const z = (row * spacing) - offset;

        // Or actually a flat plane rotating? Let's do a curved plane
        const finalX = x * 2;
        const finalY = (row * spacing) - offset;
        const finalZ = (Math.sin(x) * 2); // Wave shape

        positions.push(finalX, finalY, finalZ);
    }
    return positions;
}

// 4. Helix (DNA style)
function createHelixPositions() {
    const positions = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const t = i / PARTICLE_COUNT * 20; // Loops
        const r = 2; // Radius

        // Double helix offset
        const isStrandA = i % 2 === 0;
        const angleOffset = isStrandA ? 0 : Math.PI;

        const x = Math.cos(t + angleOffset) * r;
        const y = (i / PARTICLE_COUNT) * 10 - 5; // Height spread from -5 to 5
        const z = Math.sin(t + angleOffset) * r;

        // Add some random scatter so it's not lines
        const scatter = 0.2;
        positions.push(
            x + (Math.random() - 0.5) * scatter,
            y,
            z + (Math.random() - 0.5) * scatter
        );
    }
    return positions;
}

// 5. Torus (Donut/Ring) for Characteristics
function createTorusPositions() {
    const positions = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const u = Math.random() * Math.PI * 2;
        const v = Math.random() * Math.PI * 2;
        const R = 2.5; // Major radius
        const r = 0.8; // Minor radius

        const x = (R + r * Math.cos(v)) * Math.cos(u);
        const y = (R + r * Math.cos(v)) * Math.sin(u);
        const z = r * Math.sin(v);

        positions.push(x, y, z);
    }
    return positions;
}

// 6. Cube for Use Cases
function createCubePositions() {
    const positions = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        // Random point inside or on surface of a cube
        // Let's do surface mostly for better visibility
        const face = Math.floor(Math.random() * 6);
        const size = 3.5;
        const half = size / 2;

        let x, y, z;
        const u = (Math.random() - 0.5) * size;
        const v = (Math.random() - 0.5) * size;

        if (face === 0) { x = half; y = u; z = v; }
        else if (face === 1) { x = -half; y = u; z = v; }
        else if (face === 2) { y = half; x = u; z = v; }
        else if (face === 3) { y = -half; x = u; z = v; }
        else if (face === 4) { z = half; x = u; y = v; }
        else if (face === 5) { z = -half; x = u; y = v; }

        positions.push(x, y, z);
    }
    return positions;
}

// Initialize Targets
targets.sphere = createSpherePositions();
targets.brain = createBrainPositions();
targets.grid = createGridPositions();
targets.helix = createHelixPositions();
targets.torus = createTorusPositions();
targets.cube = createCubePositions();

// Set initial position (sphere)
for (let i = 0; i < particlePositions.length; i++) {
    currentPositions[i] = targets.sphere[i];
    particlePositions[i] = targets.sphere[i];
}

particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

// Material
const particlesMaterial = new THREE.PointsMaterial({
    color: 0x00f3ff,
    size: PARTICLE_SIZE,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});

const particleSystem = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particleSystem);


// --- Scroll Interactivity ---
// We map scroll percentage to shapes.
// 0.0 - 0.25: Sphere -> Brain
// 0.25 - 0.50: Brain -> Grid
// 0.50 - 0.75: Grid -> Helix
// 0.75 - 1.0: Helix -> Sphere

let currentScroll = 0;
const totalShapes = ['sphere', 'torus', 'brain', 'grid', 'cube', 'helix', 'sphere'];

function updateParticles() {
    // Determine which transition we are in
    const sections = document.querySelectorAll('section');
    const totalHeight = document.body.scrollHeight - window.innerHeight;
    const scrollY = window.scrollY;

    // Normalize scroll 0 to 1
    const progress = Math.max(0, Math.min(1, scrollY / totalHeight));

    // Find index in the shape array
    // We have 4 intervals between 5 items
    // scroll 0 maps to index 0 (sphere)
    // scroll 1 maps to index 4 (sphere)
    const exactIndex = progress * (totalShapes.length - 1); // 0 to 4
    const startIndex = Math.floor(exactIndex);
    const endIndex = Math.min(startIndex + 1, totalShapes.length - 1);
    const blendFactor = exactIndex - startIndex; // 0.0 to 1.0 within the transition

    const startShapeName = totalShapes[startIndex];
    const endShapeName = totalShapes[endIndex];

    const startPositions = targets[startShapeName];
    const endPositions = targets[endShapeName];

    // Morph logic
    const positions = particleSystem.geometry.attributes.position.array;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;

        // Target position for this frame
        const time = Date.now() * 0.001;
        const breathing = Math.sin(time + startPositions[i3] * 0.5) * 0.02; // Subtle wave

        const tx = startPositions[i3] + (endPositions[i3] - startPositions[i3]) * blendFactor + breathing;
        const ty = startPositions[i3 + 1] + (endPositions[i3 + 1] - startPositions[i3 + 1]) * blendFactor + breathing;
        const tz = startPositions[i3 + 2] + (endPositions[i3 + 2] - startPositions[i3 + 2]) * blendFactor;

        // Smooth visual transition (lerp current to target)
        // We use a "responsiveness" factor. 
        // Direct assignment is snappier for scroll, lerp is laggy/smooth.
        // Let's mix minor noise for dynamic movement

        positions[i3] += (tx - positions[i3]) * 0.1;
        positions[i3 + 1] += (ty - positions[i3 + 1]) * 0.1;
        positions[i3 + 2] += (tz - positions[i3 + 2]) * 0.1;

        // Add subtle constant rotation effect?
    }

    particleSystem.geometry.attributes.position.needsUpdate = true;

    // Rotate entire system slowly
    particleSystem.rotation.y += 0.001;
    particleSystem.rotation.x += 0.0005;

    // Trigger Text Animations
    if (!interactiveMode) {
        sections.forEach((section, index) => {
            const rect = section.getBoundingClientRect();
            // If section is in middle of screen
            if (rect.top < window.innerHeight * 0.6 && rect.bottom > window.innerHeight * 0.4) {
                section.classList.add('active');
            } else {
                section.classList.remove('active');
            }
        });
    }
}

// --- Merged onResults from Particle Sphere Project ---
function onResults(results) {
    if (!interactiveMode) return;

    if (results.multiHandLandmarks && results.multiHandLandmarks.length === 2) {
        // statusElement.innerText = "Zoom: Separa manos • Giro: Mueve a lados • Rotar: Inclina";

        const hand1 = results.multiHandLandmarks[0];
        const hand2 = results.multiHandLandmarks[1];
        const p1 = hand1[9]; // Middle finger knuckle
        const p2 = hand2[9];

        // 1. Distance -> Scale (Zoom)
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDist = 0.05;
        const maxDist = 0.6;
        const normalized = Math.max(0, Math.min(1, (distance - minDist) / (maxDist - minDist)));
        // Match the scale feel of the other project: 0.5 to ~6.5
        targetScale = 0.5 + Math.pow(normalized, 1.5) * 6;

        // 2. Average X Position -> Rotation Y (Spin left/right)
        const avgX = (p1.x + p2.x) / 2;
        // Map 0..1 to -2..2 radians roughly
        targetRotationY = (0.5 - avgX) * 4;

        // 3. Angle between hands -> Rotation Z (Tilt like wheel)
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        targetRotationZ = angle;

    } else if (results.multiHandLandmarks && results.multiHandLandmarks.length === 1) {
        // One hand: return to neutral logic or wait
        targetScale = 1;
        targetRotationY = 0;
        targetRotationZ = 0;
    } else {
        // No hands
        targetScale = 1;
        targetRotationY = 0;
        targetRotationZ = 0;
    }
}

// --- Robust MediaPipe Integration (Native) ---
let interactiveMode = false;
let handScale = 1.0;
// let handScale = 1.0; // Already declared above
const videoElement = document.querySelector('.input_video');
// Video hidden for user experience
videoElement.style.opacity = '0';
videoElement.style.width = '0';
videoElement.style.height = '0';
videoElement.style.position = 'absolute';
videoElement.style.zIndex = '-1';
// Button Logic - REPLACED BY HTML NAVIGATION
// btn logic removed as we use direct <a> links now.

// --- Main Loop Integration ---
// No separate processAI needed with Camera Utils

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);

    if (interactiveMode) {
        // Nothing here, redirecting...
    } else {
        updateParticles();
        particleSystem.scale.set(1, 1, 1);
        particleSystem.material.color.setHex(0x00f3ff);
    }

    renderer.render(scene, camera);
}

// --- Resize Handler ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start
animate();
