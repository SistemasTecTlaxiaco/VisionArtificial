// Import removed for direct browser usage
// --- Configuration ---
const PARTICLE_COUNT = 3000;
const PARTICLE_SIZE = 0.04;
const CAMERA_Z = 7;

// --- Scene Setup ---
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050508, 0.08);

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
const particlesGeometry = new THREE.BufferGeometry();
const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
const currentPositions = new Float32Array(PARTICLE_COUNT * 3);

const targets = {
    sphere: [],
    torus: [],
    brain: [],
    grid: [],
    cube: [],
    helix: []
};

// --- Geometry Generators ---

// 1. Esfera
function createSpherePositions() {
    const pos = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        const r = 2.8 + (Math.random() * 0.4);
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);
        pos.push(x, y, z);
    }
    return pos;
}

// 2. Toroide (Redes/Conectividad)
function createTorusPositions() {
    const pos = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const u = Math.random() * Math.PI * 2;
        const v = Math.random() * Math.PI * 2;
        const R = 2.8;
        const r = 0.9;
        const x = (R + r * Math.cos(v)) * Math.cos(u);
        const y = (R + r * Math.cos(v)) * Math.sin(u);
        const z = r * Math.sin(v);
        pos.push(x, y, z);
    }
    return pos;
}

// 3. Cerebro (IA)
function createBrainPositions() {
    const pos = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const isRight = Math.random() > 0.5;
        const xOffset = isRight ? 0.8 : -0.8;
        let u = Math.random();
        let v = Math.random();
        let theta = 2 * Math.PI * u;
        let phi = Math.acos(2 * v - 1);
        let r = 1.4;
        let x = r * Math.sin(phi) * Math.cos(theta);
        let y = r * Math.sin(phi) * Math.sin(theta);
        let z = r * Math.cos(phi);
        x *= 0.8;
        y *= 0.6;
        z *= 0.9;
        x += (Math.sin(y * 10) * 0.1);
        pos.push(x + xOffset, y, z);
    }
    return pos;
}

// 4. Grid (Datos/Matrix)
function createGridPositions() {
    const pos = [];
    const rows = Math.sqrt(PARTICLE_COUNT);
    const spacing = 0.25;
    const offset = (rows * spacing) / 2;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const col = i % Math.floor(rows);
        const row = Math.floor(i / rows);
        const x = (col * spacing) - offset;
        const finalX = x * 2.5;
        const finalY = (row * spacing) - offset;
        const finalZ = (Math.sin(x) * 2);
        pos.push(finalX, finalY, finalZ);
    }
    return pos;
}

// 5. Cubo (Hardware/IoT)
function createCubePositions() {
    const pos = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const face = Math.floor(Math.random() * 6);
        const size = 3.8;
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
        pos.push(x, y, z);
    }
    return pos;
}

// 6. Hélice (ADN/Futuro)
function createHelixPositions() {
    const pos = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const t = i / PARTICLE_COUNT * 20;
        const r = 2.2;
        const isStrandA = i % 2 === 0;
        const angleOffset = isStrandA ? 0 : Math.PI;
        const x = Math.cos(t + angleOffset) * r;
        const y = (i / PARTICLE_COUNT) * 12 - 6;
        const z = Math.sin(t + angleOffset) * r;
        const scatter = 0.3;
        pos.push(
            x + (Math.random() - 0.5) * scatter,
            y,
            z + (Math.random() - 0.5) * scatter
        );
    }
    return pos;
}

// Init targets
targets.sphere = createSpherePositions();
targets.torus = createTorusPositions();
targets.brain = createBrainPositions();
targets.grid = createGridPositions();
targets.cube = createCubePositions();
targets.helix = createHelixPositions();

for (let i = 0; i < particlePositions.length; i++) {
    currentPositions[i] = targets.sphere[i];
    particlePositions[i] = targets.sphere[i];
}

particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

// Material Neón
const particlesMaterial = new THREE.PointsMaterial({
    color: 0x00f3ff, // Cyan neón
    size: PARTICLE_SIZE,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});

const particleSystem = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particleSystem);

// --- Scroll Logic ---
const totalShapes = ['sphere', 'torus', 'brain', 'grid', 'cube', 'helix', 'sphere'];

function updateParticles() {
    const sections = document.querySelectorAll('section');
    const totalHeight = document.body.scrollHeight - window.innerHeight;
    const scrollY = window.scrollY;

    const progress = Math.max(0, Math.min(1, scrollY / (totalHeight || 1)));

    // Calcular transición entre formas
    const exactIndex = progress * (totalShapes.length - 1);
    const startIndex = Math.floor(exactIndex);
    const endIndex = Math.min(startIndex + 1, totalShapes.length - 1);
    const blendFactor = exactIndex - startIndex;

    const startPositions = targets[totalShapes[startIndex]];
    const endPositions = targets[totalShapes[endIndex]];
    const positions = particleSystem.geometry.attributes.position.array;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        const time = Date.now() * 0.001;
        const breathing = Math.sin(time + startPositions[i3] * 0.5) * 0.02;

        const tx = startPositions[i3] + (endPositions[i3] - startPositions[i3]) * blendFactor + breathing;
        const ty = startPositions[i3 + 1] + (endPositions[i3 + 1] - startPositions[i3 + 1]) * blendFactor + breathing;
        const tz = startPositions[i3 + 2] + (endPositions[i3 + 2] - startPositions[i3 + 2]) * blendFactor;

        // Suavizado (Lerp)
        positions[i3] += (tx - positions[i3]) * 0.1;
        positions[i3 + 1] += (ty - positions[i3 + 1]) * 0.1;
        positions[i3 + 2] += (tz - positions[i3 + 2]) * 0.1;
    }

    particleSystem.geometry.attributes.position.needsUpdate = true;

    // Rotación lenta ambiental
    particleSystem.rotation.y += 0.0015;
    particleSystem.rotation.x += 0.0005;

    // Activar opacidad de las tarjetas al scrollear
    sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.65 && rect.bottom > window.innerHeight * 0.35) {
            section.classList.add('active');
        } else {
            section.classList.remove('active');
        }
    });

    // Cambiar color sutilmente según la sección (Mágico!)
    if (startIndex === 2) {
        particlesMaterial.color.lerp(new THREE.Color(0xd53369), 0.05); // Rosado IA
    } else if (startIndex === 4) {
        particlesMaterial.color.lerp(new THREE.Color(0xccff00), 0.05); // Verde IoT
    } else {
        particlesMaterial.color.lerp(new THREE.Color(0x00f3ff), 0.05); // Cyan Base
    }
}

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);
    updateParticles();
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
