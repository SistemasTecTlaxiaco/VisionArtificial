// ============================================================
//  HOST.JS  –  Sable Láser  (multi-player ready)
// ============================================================

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
bladeGeo.translate(0, 2, 0);
const bladeMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const blade = new THREE.Mesh(bladeGeo, bladeMat);

// Glow effect
const glowGeo = new THREE.CylinderGeometry(0.15, 0.15, 3.1, 16);
glowGeo.translate(0, 2, 0);
const glowMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.3, side: THREE.BackSide });
const glow = new THREE.Mesh(glowGeo, glowMat);

const saber = new THREE.Group();
saber.add(handle);
saber.add(blade);
saber.add(glow);
scene.add(saber);

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);
    if (!isAnyConnected()) {
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


// ============================================================
//  PeerJS – Multi-connection logic
// ============================================================

// Generar ID
const shortId = Math.floor(1000 + Math.random() * 9000).toString();

// Map of peerId -> { conn, name }
const connections = {};

function isAnyConnected() {
    return Object.keys(connections).length > 0;
}

function updatePlayersUI() {
    const list = document.getElementById('players-list');
    const count = Object.keys(connections).length;
    const statusEl = document.getElementById('status');

    if (count === 0) {
        statusEl.innerText = '⏳ Esperando conexiones...';
        statusEl.className = '';
        list.innerHTML = '';
    } else {
        statusEl.innerText = `🟢 ${count} alumno${count > 1 ? 's' : ''} conectado${count > 1 ? 's' : ''}`;
        statusEl.className = 'connected';
        list.innerHTML = Object.values(connections)
            .map(c => `<span class="player-tag">📱 ${c.name}</span>`)
            .join('');
    }
}

// ============================================================
//  Build the controller URL with current LAN IP (best effort)
// ============================================================
function buildControllerUrl(code) {
    const proto = location.protocol;
    const host = location.hostname;
    const port = location.port ? ':' + location.port : '';
    const base = location.pathname.replace(/\/remote_control\/.*$/, '');
    return `${proto}//${host}${port}${base}/remote_control/controller.html?id=${code}`;
}

// ─── Generate UI immediately so it's not totally blank ───
document.getElementById('my-id').innerText = shortId;
const controllerUrl = buildControllerUrl(shortId);
document.getElementById('server-url').innerText = controllerUrl;

try {
    // Definimos explicitamente el QR
    new QRCode(document.getElementById('qrcode'), {
        text: controllerUrl,
        width: 220,
        height: 220,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
    });
} catch (e) {
    console.error("QR Code Error:", e);
    document.getElementById('status').innerText = '⚠️ Error rendering QR';
}

// ─── Peer Logic ───
let peer;
try {
    peer = new Peer('ai-pres-host-' + shortId, {
        host: '0.peerjs.com',
        port: 443,
        secure: true,
        debug: 2
    });
} catch (e) {
    document.getElementById('status').innerText = '❌ Error de red inicializando PeerJS.';
}

if (peer) {
    peer.on('open', (id) => {
        console.log('Host peer ID:', id);
        document.getElementById('status').innerText = '⏳ Servidor P2P Listo para Internet Global. Escanea el QR...';
    });

    peer.on('connection', (conn) => {
        const peerId = conn.peer;
        const name = 'Alumno ' + peerId.slice(-4).toUpperCase();
        connections[peerId] = { conn, name };
        updatePlayersUI();

        conn.on('data', (data) => {
            const deg2rad = Math.PI / 180;
            saber.rotation.x += ((data.beta * deg2rad) - saber.rotation.x) * 0.2;
            saber.rotation.y += ((data.alpha * deg2rad) - saber.rotation.y) * 0.2;
            saber.rotation.z += ((-data.gamma * deg2rad) - saber.rotation.z) * 0.2;
        });

        conn.on('close', () => {
            delete connections[peerId];
            updatePlayersUI();
        });

        conn.on('error', (err) => {
            console.error('Connection error:', err);
            delete connections[peerId];
            updatePlayersUI();
        });
    });

    peer.on('error', (err) => {
        console.error('Peer error:', err);
        document.getElementById('status').innerText = '❌ Error P2P (Aviso: Revisa conexión wi-fi): ' + err.type;
        document.getElementById('status').style.color = '#ff3366';
    });
}
