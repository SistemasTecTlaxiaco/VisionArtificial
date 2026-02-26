// ============================================================
//  CONTROLLER.JS  –  Sable Láser (mobile controller)
//  Auto-connects if ?id=XXXX is present in the URL (from QR)
// ============================================================

const connectBtn = document.getElementById('connect-btn');
const input = document.getElementById('host-id-input');
const statusEl = document.getElementById('status');
const controlsUI = document.getElementById('controls-ui');
const connUI = document.getElementById('connection-ui');
const permUI = document.getElementById('permissions-ui');

let peer = null;
let conn = null;

// ── 1. Read ?id= from QR link and pre-fill ──────────────────
const urlParams = new URLSearchParams(window.location.search);
const autoId = urlParams.get('id');

if (autoId) {
    input.value = autoId;
}

// ── 2. iOS 13+ Permission gate ───────────────────────────────
const needsPermission =
    typeof DeviceOrientationEvent !== 'undefined' &&
    typeof DeviceOrientationEvent.requestPermission === 'function';

if (needsPermission) {
    // Show permission card first, hide connection card
    permUI.style.display = 'block';
    connUI.style.display = 'none';

    document.getElementById('perm-btn').addEventListener('click', () => {
        DeviceOrientationEvent.requestPermission()
            .then(response => {
                if (response === 'granted') {
                    permUI.style.display = 'none';
                    connUI.style.display = 'block';
                    // If code was in URL, auto-connect after permission
                    if (autoId) attemptConnect(autoId);
                } else {
                    alert('Permiso denegado. No podrás usar el giroscopio.');
                }
            })
            .catch(console.error);
    });
} else {
    // Android / Desktop: no permission needed
    // If code came from QR → connect automatically
    if (autoId) {
        attemptConnect(autoId);
    }
}

// ── 3. Manual connect button ─────────────────────────────────
connectBtn.addEventListener('click', () => {
    const id = input.value.trim();
    if (!id) return;
    attemptConnect(id);
});

// ── 4. Core connect logic ─────────────────────────────────────
function attemptConnect(code) {
    setStatus('Conectando…');
    connectBtn.disabled = true;
    connectBtn.innerText = '⏳ Conectando…';

    peer = new Peer(); // auto-generated ID for mobile

    peer.on('open', () => {
        conn = peer.connect('ai-pres-host-' + code);

        conn.on('open', () => {
            // Hide connection card, show active controller
            connUI.style.display = 'none';
            permUI.style.display = 'none';
            controlsUI.style.display = 'block';
            setStatus('');
            startSending();
        });

        conn.on('error', (err) => {
            setStatus('Error al conectar. Verifica el código.', true);
            connectBtn.disabled = false;
            connectBtn.innerText = '⚡ CONECTAR';
        });
    });

    peer.on('error', (err) => {
        setStatus('Error de red: ' + err.type, true);
        connectBtn.disabled = false;
        connectBtn.innerText = '⚡ CONECTAR';
    });
}

// ── 5. Stream gyroscope data ──────────────────────────────────
function startSending() {
    window.addEventListener('deviceorientation', (event) => {
        if (conn && conn.open) {
            conn.send({
                alpha: event.alpha,   // Z – compass heading
                beta: event.beta,    // X – front/back tilt
                gamma: event.gamma    // Y – left/right tilt
            });

            // Live display for students (makes it engaging)
            document.getElementById('val-alpha').innerText = Math.round(event.alpha ?? 0);
            document.getElementById('val-beta').innerText = Math.round(event.beta ?? 0);
            document.getElementById('val-gamma').innerText = Math.round(event.gamma ?? 0);
        }
    });
}

// ── Helpers ───────────────────────────────────────────────────
function setStatus(msg, isError = false) {
    // Update whichever status element is visible
    document.querySelectorAll('#status').forEach(el => {
        el.innerText = msg;
        el.className = isError ? 'error-msg' : '';
    });
}
