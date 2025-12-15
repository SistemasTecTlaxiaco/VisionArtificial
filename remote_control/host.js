// --- Three.js Setup (Saber) ---
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.02);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lights
const ambient = new THREE.AmbientLight(0x404040);
scene.add(ambient);
const point = new THREE.PointLight(0xffffff, 1);
point.position.set(5, 5, 5);
scene.add(point);

// Saber Handle
const handleGeo = new THREE.CylinderGeometry(0.1, 0.1, 1, 16);
const handleMat = new THREE.MeshPhongMaterial({ color: 0x888888 });
const handle = new THREE.Mesh(handleGeo, handleMat);

// Saber Blade (Glowing)
const bladeGeo = new THREE.CylinderGeometry(0.08, 0.08, 3, 16);
bladeGeo.translate(0, 2, 0); // Move up so it sits on handle
const bladeMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const blade = new THREE.Mesh(bladeGeo, bladeMat);

// Glow effect (simple outer mesh)
const glowGeo = new THREE.CylinderGeometry(0.15, 0.15, 3.1, 16);
glowGeo.translate(0, 2, 0);
const glowMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.3, side: THREE.BackSide });
const glow = new THREE.Mesh(glowGeo, glowMat);

// Group
const saber = new THREE.Group();
saber.add(handle);
saber.add(blade);
saber.add(glow);
scene.add(saber);

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);

    // Idle animation if not connected
    if (!isConnected) {
        saber.rotation.z = Math.sin(Date.now() * 0.001) * 0.1;
        saber.rotation.y += 0.01;
    }

    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});


// --- PeerJS Logic ---
// Generate a short ID for easier typing on mobile
const shortId = Math.floor(1000 + Math.random() * 9000).toString();
const peer = new Peer('ai-pres-host-' + shortId);

let isConnected = false;

peer.on('open', (id) => {
    document.getElementById('my-id').innerText = shortId;
    console.log('My peer ID is: ' + id);
});

peer.on('connection', (conn) => {
    document.getElementById('status').innerText = "🟢 Conectado con móvil";
    document.getElementById('status').style.color = "#00ff00";
    isConnected = true;

    conn.on('data', (data) => {
        // data looks like { alpha, beta, gamma }
        // Mobile orientation is tricky.
        // Alpha: Z axis (0-360)
        // Beta: X axis (-180 to 180) - Tilt Front/Back
        // Gamma: Y axis (-90 to 90) - Tilt Left/Right

        // Convert degrees to radians
        const deg2rad = Math.PI / 180;

        // This mapping depends on how holding the phone.
        // Assuming holding portrait:

        // Direct rotation set is often jittery or gimbal locked.
        // Using Euler directly:

        // Adjust for Three.js coordinate system
        const x = data.beta * deg2rad;
        const y = data.alpha * deg2rad;
        const z = -data.gamma * deg2rad;

        // Smooth interpolation
        saber.rotation.x += (x - saber.rotation.x) * 0.2;
        saber.rotation.y += (y - saber.rotation.y) * 0.2;
        // saber.rotation.z is usually Gamma in mobile (roll)
        saber.rotation.z += (z - saber.rotation.z) * 0.2;
    });

    conn.on('close', () => {
        document.getElementById('status').innerText = "🔴 Desconectado";
        isConnected = false;
    });
});
