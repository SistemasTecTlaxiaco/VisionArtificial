// --- Game Constants & State ---
const videoElement = document.querySelector('.input_video');
const canvasElement = document.getElementById('game-canvas');
const iconFist = document.getElementById('icon-fist');
const iconPalm = document.getElementById('icon-palm');
const iconPoint = document.getElementById('icon-point');
const cursor = document.getElementById('hand-cursor');

let score = 0;
let gameActive = true;
const enemies = [];
const projectiles = [];
const particles = [];
let frameCount = 0;
let lastGesture = 'neutral';
let shieldActive = false;
let shieldMesh = null;

// --- Three.js Setup ---
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050510, 0.02);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ canvas: canvasElement, alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(0, 10, 10);
scene.add(dirLight);

// --- Game Objects Builders ---

// 1. Shield (Fist)
function createShield() {
    const geo = new THREE.IcosahedronGeometry(1.5, 2);
    const mat = new THREE.MeshPhongMaterial({
        color: 0xff0055,
        transparent: true,
        opacity: 0.3,
        wireframe: true,
        emissive: 0xff0055,
        emissiveIntensity: 0.5
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.z = 4; // Just in front of camera
    scene.add(mesh);
    return mesh;
}
shieldMesh = createShield();
shieldMesh.visible = false;

// 2. Projectile (Index)
function shootProjectile(position) {
    const geo = new THREE.SphereGeometry(0.1, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    const mesh = new THREE.Mesh(geo, mat);

    // Convert screen x/y to world x/y roughly
    // Map normalized 0..1 to -aspect..aspect
    const aspect = window.innerWidth / window.innerHeight;
    const x = (1 - position.x) * 10 - 5; // Mirror x
    const y = (1 - position.y) * 6 - 3;

    mesh.position.set(x, y, 4);

    projectiles.push({
        mesh: mesh,
        velocity: new THREE.Vector3(0, 0, -0.5) // Shoot forward
    });
    scene.add(mesh);
}

// 3. Enemy
function spawnEnemy() {
    const geo = new THREE.TetrahedronGeometry(0.5);
    const mat = new THREE.MeshPhongMaterial({ color: 0x555555, flatShading: true });
    const mesh = new THREE.Mesh(geo, mat);

    // Spawn far away random XY
    mesh.position.x = (Math.random() - 0.5) * 10;
    mesh.position.y = (Math.random() - 0.5) * 6;
    mesh.position.z = -20;

    scene.add(mesh);
    enemies.push({
        mesh: mesh,
        speed: 0.05 + Math.random() * 0.05
    });
}

// 4. Particles (Explosion)
function createExplosion(position, color) {
    for (let i = 0; i < 8; i++) {
        const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const mat = new THREE.MeshBasicMaterial({ color: color });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);

        particles.push({
            mesh: mesh,
            vel: new THREE.Vector3((Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2),
            life: 1.0
        });
        scene.add(mesh);
    }
}

// --- Main Loop ---
function animate() {
    requestAnimationFrame(animate);
    frameCount++;

    // 1. Spawner
    if (frameCount % 60 === 0) { // Every second-ish
        spawnEnemy();
    }

    // 2. Update Shield
    if (shieldActive) {
        shieldMesh.visible = true;
        shieldMesh.rotation.y += 0.05;
        shieldMesh.material.opacity = 0.3 + Math.sin(frameCount * 0.1) * 0.1;
    } else {
        shieldMesh.visible = false;
    }

    // 3. Update Projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.mesh.position.add(p.velocity);

        // Remove if too far
        if (p.mesh.position.z < -30) {
            scene.remove(p.mesh);
            projectiles.splice(i, 1);
        }
    }

    // 4. Update Enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.mesh.position.z += e.speed;
        e.mesh.rotation.x += 0.02;
        e.mesh.rotation.y += 0.02;

        // Collision: Enemy vs Player (Screen)
        if (e.mesh.position.z > 4) {
            if (shieldActive) {
                // Blocked!
                createExplosion(e.mesh.position, 0xff0055);
                scene.remove(e.mesh);
                enemies.splice(i, 1);
                score += 5;
            } else {
                // Hit!
                // Flash red screen or something
                scene.remove(e.mesh);
                enemies.splice(i, 1);
                score = Math.max(0, score - 10);
                document.querySelector('.score').style.color = 'red';
                setTimeout(() => document.querySelector('.score').style.color = '#00ffff', 200);
            }
            updateScore();
            continue;
        }

        // Collision: Enemy vs Projectile
        for (let j = projectiles.length - 1; j >= 0; j--) {
            const p = projectiles[j];
            const dist = p.mesh.position.distanceTo(e.mesh.position);

            if (dist < 0.8) {
                // Hit!
                createExplosion(e.mesh.position, 0xffaa00);

                scene.remove(e.mesh);
                enemies.splice(i, 1);

                scene.remove(p.mesh);
                projectiles.splice(j, 1);

                score += 10;
                updateScore();
                break; // Enemy dead, stop checking projectiles
            }
        }
    }

    // 5. Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.mesh.position.add(p.vel);
        p.life -= 0.05;
        p.mesh.scale.setScalar(p.life);

        if (p.life <= 0) {
            scene.remove(p.mesh);
            particles.splice(i, 1);
        }
    }

    renderer.render(scene, camera);
}
animate();

function updateScore() {
    document.querySelector('.score').innerText = `Puntos: ${score}`;
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Logic Hook ---
function handleGestureAction(gesture, landmarks) {
    if (gesture === 'fist') {
        shieldActive = true;
    } else {
        shieldActive = false;
    }

    if (gesture === 'point') {
        // Auto-fire every few frames if holding point
        if (frameCount % 10 === 0) {
            shootProjectile(landmarks[8]); // Tip of index
        }
    }

    if (gesture === 'palm') {
        // Force Push: Move enemies back
        enemies.forEach(e => {
            if (e.mesh.position.z > -10) {
                e.mesh.position.z -= 0.5; // Push back
            }
        });
    }
}

// --- MediaPipe Logic ---

function detectGesture(landmarks) {
    // Basic finger status (Open/Closed)
    // Tips: 8, 12, 16, 20
    // PIP joints: 6, 10, 14, 18

    // Check if fingers are extended (Tip higher than PIP in Y - wait, Y is down in screen coords?)
    // Actually, distance from wrist (0) is more reliable for general poses.

    // Simple logic:
    // Index(8) distance to Wrist(0) vs IndexPIP(6) distance to Wrist(0)

    const wrist = landmarks[0];

    const isFingerExtended = (tipIdx, pipIdx) => {
        const dTip = dist(landmarks[tipIdx], wrist);
        const dPip = dist(landmarks[pipIdx], wrist);
        return dTip > dPip * 1.2; // Tip significantly further
    };

    const dist = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

    const indexExt = isFingerExtended(8, 6);
    const middleExt = isFingerExtended(12, 10);
    const ringExt = isFingerExtended(16, 14);
    const pinkyExt = isFingerExtended(20, 18);
    // Thumb is tricky, ignore for basic logic for now or check angle

    // 1. FIST: All fingers closed
    if (!indexExt && !middleExt && !ringExt && !pinkyExt) {
        return 'fist';
    }

    // 2. PALM: All fingers open
    if (indexExt && middleExt && ringExt && pinkyExt) {
        return 'palm';
    }

    // 3. POINT: Index open, others closed
    if (indexExt && !middleExt && !ringExt && !pinkyExt) {
        return 'point';
    }

    return 'neutral';
}

function onResults(results) {
    // Reset Icons
    iconFist.classList.remove('active');
    iconPalm.classList.remove('active');
    iconPoint.classList.remove('active');

    // Reset Cursor
    cursor.style.display = 'none';

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];

        // Update Cursor
        const tip = landmarks[8];
        const x = (1 - tip.x) * window.innerWidth;
        const y = tip.y * window.innerHeight;
        cursor.style.left = `${x}px`;
        cursor.style.top = `${y}px`;
        cursor.style.display = 'block';

        const gesture = detectGesture(landmarks);

        // Update UI
        if (gesture === 'fist') iconFist.classList.add('active');
        if (gesture === 'palm') iconPalm.classList.add('active');
        if (gesture === 'point') iconPoint.classList.add('active');

        // Trigger Game Logic
        handleGestureAction(gesture, landmarks);
    } else {
        // No hands
        shieldActive = false;
    }
}

const hands = new Hands({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }
});

hands.setOptions({
    maxNumHands: 1, // Single player for now?
    modelComplexity: 0,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

hands.onResults(onResults);

const cameraUtils = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({ image: videoElement });
    },
    width: 640,
    height: 480
});

cameraUtils.start();
