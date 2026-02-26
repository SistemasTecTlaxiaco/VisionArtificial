// ==========================================================
// CIBERDEFENSA AI - Ingeniería en Sistemas
// Core Game Logic
// ==========================================================

const videoElement = document.querySelector('.input_video');
const canvasElement = document.getElementById('game-canvas');
const scoreEl = document.getElementById('score-val');
const healthBar = document.getElementById('health-bar');
const damageOverlay = document.getElementById('damage-overlay');
const gameOverScreen = document.getElementById('game-over');
const cursor = document.getElementById('hand-cursor');

// UI Boxes
const boxFist = document.getElementById('box-fist');
const boxPalm = document.getElementById('box-palm');
const boxPoint = document.getElementById('box-point');

// Game State
let score = 0;
let health = 100;
let gameActive = true;
const enemies = [];
const projectiles = [];
const particles = [];
let frameCount = 0;
let shieldActive = false;
let shieldMesh = null;
let currentLevel = 1;
let spawnRate = 60; // Frames per spawn

// --- Three.js Setup (Hacker Theme) ---
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x020205, 0.04); // Dark blue/black fog

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 6;

const renderer = new THREE.WebGLRenderer({ canvas: canvasElement, alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(0, 10, 10);
scene.add(dirLight);

// --- Grid Background (Cyberspace floor) ---
const gridHelper = new THREE.GridHelper(50, 50, 0x00ff66, 0x002200);
gridHelper.position.y = -3;
scene.add(gridHelper);

// --- Game Objects Builders ---

// 1. Firewall (Fist) -> Cyan Wireframe Dome
function createShield() {
    const geo = new THREE.IcosahedronGeometry(1.8, 1);
    const mat = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.15,
        wireframe: true
    });

    // Solid core
    const coreMat = new THREE.MeshPhongMaterial({
        color: 0x0055ff,
        transparent: true,
        opacity: 0.2,
        emissive: 0x0022ff
    });

    const group = new THREE.Group();
    group.add(new THREE.Mesh(geo, mat));
    group.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.6, 2), coreMat));

    group.position.z = 4.5;
    scene.add(group);
    return group;
}
shieldMesh = createShield();
shieldMesh.visible = false;

// 2. Laser Shot (Index Point) -> Green Cylinder
function shootProjectile(position) {
    if (!gameActive) return;

    const geo = new THREE.CylinderGeometry(0.02, 0.02, 1, 8);
    geo.rotateX(Math.PI / 2); // Point forward
    const mat = new THREE.MeshBasicMaterial({ color: 0x00ff66 });
    const mesh = new THREE.Mesh(geo, mat);

    // Map screen x/y to relative world x/y
    const x = (1 - position.x) * 12 - 6; // Mirror x, wider range
    const y = (1 - position.y) * 8 - 4;

    mesh.position.set(x, y, 4.5);

    projectiles.push({
        mesh: mesh,
        velocity: new THREE.Vector3(0, 0, -0.8) // Fast laser
    });
    scene.add(mesh);
}

// 3. Malware (Enemy) -> Red Octahedron Spike
function spawnEnemy() {
    if (!gameActive) return;

    const geo = new THREE.OctahedronGeometry(0.6, 0);
    const mat = new THREE.MeshPhongMaterial({
        color: 0xff0055,
        emissive: 0x330011,
        flatShading: true
    });
    const mesh = new THREE.Mesh(geo, mat);

    mesh.position.x = (Math.random() - 0.5) * 14;
    mesh.position.y = (Math.random() - 0.5) * 8;
    mesh.position.z = -25; // Spawn deep in cyberspace

    scene.add(mesh);
    enemies.push({
        mesh: mesh,
        speed: 0.08 + (Math.random() * 0.06) + (currentLevel * 0.02), // Faster each level
        rotX: (Math.random() - 0.5) * 0.1,
        rotY: (Math.random() - 0.5) * 0.1
    });
}

// 4. Data Fragments (Explosion)
function createExplosion(position, colorHex) {
    for (let i = 0; i < 15; i++) {
        const geo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
        const mat = new THREE.MeshBasicMaterial({ color: colorHex });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);

        particles.push({
            mesh: mesh,
            vel: new THREE.Vector3((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4),
            life: 1.0
        });
        scene.add(mesh);
    }
}

// --- Status Updates ---
function updateHUD() {
    scoreEl.innerText = score;
    // Level up logic
    if (score > currentLevel * 200) {
        currentLevel++;
        spawnRate = Math.max(15, spawnRate - 10);
    }
}

function takeDamage(amount) {
    health -= amount;
    healthBar.style.width = Math.max(0, health) + '%';

    // UI Effects
    document.querySelector('.ui-layer').classList.add('glitch');
    damageOverlay.style.opacity = '1';

    setTimeout(() => {
        document.querySelector('.ui-layer').classList.remove('glitch');
        damageOverlay.style.opacity = '0';
    }, 150);

    if (health <= 0) {
        gameOver();
    }
}

function gameOver() {
    gameActive = false;
    gameOverScreen.style.display = 'block';
    document.querySelector('.ui-layer').style.display = 'none';
    cursor.style.display = 'none';
}

// --- Main Loop ---
function animate() {
    requestAnimationFrame(animate);

    // Grid animation
    if (gameActive) gridHelper.position.z = (gridHelper.position.z + 0.05) % 1;

    frameCount++;

    if (gameActive && frameCount % spawnRate === 0) {
        spawnEnemy();
    }

    // Shield Animation
    if (shieldActive && gameActive) {
        shieldMesh.visible = true;
        shieldMesh.rotation.y += 0.02;
        shieldMesh.rotation.x += 0.01;
    } else {
        shieldMesh.visible = false;
    }

    // Update Projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.mesh.position.add(p.velocity);

        if (p.mesh.position.z < -35) {
            scene.remove(p.mesh);
            projectiles.splice(i, 1);
        }
    }

    // Update Enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];

        if (!gameActive) {
            e.mesh.rotation.y += 0.01;
            continue;
        }

        e.mesh.position.z += e.speed;
        e.mesh.rotation.x += e.rotX;
        e.mesh.rotation.y += e.rotY;

        // Collision: Enemy vs Player / Shield
        if (e.mesh.position.z > 4.5) {
            if (shieldActive) {
                // Blocked by Firewall
                createExplosion(e.mesh.position, 0x00ffff);
                score += 10;
            } else {
                // System Damage!
                takeDamage(15);
                createExplosion(e.mesh.position, 0xff0000);
            }
            scene.remove(e.mesh);
            enemies.splice(i, 1);
            updateHUD();
            continue;
        }

        // Collision: Enemy vs Laser
        for (let j = projectiles.length - 1; j >= 0; j--) {
            const p = projectiles[j];
            const dist = p.mesh.position.distanceTo(e.mesh.position);

            if (dist < 0.9) {
                // Deleted Malware
                createExplosion(e.mesh.position, 0x00ff66);
                scene.remove(e.mesh);
                enemies.splice(i, 1);
                scene.remove(p.mesh);
                projectiles.splice(j, 1);

                score += 25;
                updateHUD();
                break;
            }
        }
    }

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.mesh.position.add(p.vel);
        p.life -= 0.03;
        p.mesh.scale.setScalar(Math.max(0, p.life));

        if (p.life <= 0) {
            scene.remove(p.mesh);
            particles.splice(i, 1);
        }
    }

    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- MediaPipe Gesture Logic ---
let lastShotTime = 0;

function handleGestureAction(gesture, landmarks) {
    if (!gameActive) return;

    // Reset boxes UI
    boxFist.classList.remove('active');
    boxPalm.classList.remove('active');
    boxPoint.classList.remove('active');

    if (gesture === 'fist') {
        shieldActive = true;
        boxFist.classList.add('active');
    } else {
        shieldActive = false;
    }

    if (gesture === 'point') {
        boxPoint.classList.add('active');
        // Auto-fire limiter (every 8 frames)
        if (frameCount - lastShotTime > 8) {
            shootProjectile(landmarks[8]); // Index tip
            lastShotTime = frameCount;
        }
    }

    if (gesture === 'palm') {
        boxPalm.classList.add('active');
        // Purge (Force Push) - visually moves elements back
        enemies.forEach(e => {
            if (e.mesh.position.z > -10 && e.mesh.position.z < 3) {
                e.mesh.position.z -= 0.6; // Push malware back
            }
        });
    }
}

// MediaPipe Finger Helper
function detectGesture(landmarks) {
    const wrist = landmarks[0];
    const dist = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

    const isFingerExtended = (tipIdx, pipIdx) => {
        return dist(landmarks[tipIdx], wrist) > dist(landmarks[pipIdx], wrist) * 1.25;
    };

    const indexExt = isFingerExtended(8, 6);
    const middleExt = isFingerExtended(12, 10);
    const ringExt = isFingerExtended(16, 14);
    const pinkyExt = isFingerExtended(20, 18);

    if (!indexExt && !middleExt && !ringExt && !pinkyExt) return 'fist';
    if (indexExt && middleExt && ringExt && pinkyExt) return 'palm';
    if (indexExt && !middleExt && !ringExt && !pinkyExt) return 'point';

    return 'neutral';
}

function onResults(results) {
    if (!gameActive) return;

    cursor.style.display = 'none';

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];

        // Move target cursor
        const tip = landmarks[8];
        const x = (1 - tip.x) * window.innerWidth;
        const y = tip.y * window.innerHeight;
        cursor.style.left = `${x}px`;
        cursor.style.top = `${y}px`;
        cursor.style.display = 'block';

        const gesture = detectGesture(landmarks);
        handleGestureAction(gesture, landmarks);

    } else {
        shieldActive = false;
        boxFist.classList.remove('active');
        boxPalm.classList.remove('active');
        boxPoint.classList.remove('active');
    }
}

const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 0,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});
hands.onResults(onResults);

const cameraUtils = new Camera(videoElement, {
    onFrame: async () => {
        if (gameActive) await hands.send({ image: videoElement });
    },
    width: 640,
    height: 480
});

cameraUtils.start();
