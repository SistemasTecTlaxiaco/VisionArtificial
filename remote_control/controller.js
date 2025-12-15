const connectBtn = document.getElementById('connect-btn');
const input = document.getElementById('host-id-input');
const status = document.getElementById('status');
const controlsUI = document.getElementById('controls-ui');
const connUI = document.getElementById('connection-ui');
const permUI = document.getElementById('permissions-ui');

let peer = null;
let conn = null;

// Permission Check for iOS 13+
if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    permUI.style.display = 'block';
    connUI.style.display = 'none';

    document.getElementById('perm-btn').addEventListener('click', () => {
        DeviceOrientationEvent.requestPermission()
            .then(response => {
                if (response == 'granted') {
                    permUI.style.display = 'none';
                    connUI.style.display = 'block';
                } else {
                    alert("Permiso denegado. No podrás usar el control.");
                }
            })
            .catch(console.error);
    });
}

connectBtn.addEventListener('click', () => {
    const id = input.value;
    if (!id) return;

    status.innerText = "Conectando...";

    // Init Peer
    peer = new Peer(); // Auto-gen ID for mobile

    peer.on('open', () => {
        // Connect to Host
        conn = peer.connect('ai-pres-host-' + id);

        conn.on('open', () => {
            status.innerText = "Conectado!";
            connUI.style.display = 'none';
            controlsUI.style.display = 'block';
            startSending();
        });

        conn.on('error', (err) => {
            status.innerText = "Error: " + err;
        });
    });

    peer.on('error', (err) => {
        status.innerText = "Peer Error: " + err;
    });
});

function startSending() {
    window.addEventListener('deviceorientation', (event) => {
        if (conn && conn.open) {
            // Send essential data only to save bandwidth/latency
            conn.send({
                alpha: event.alpha, // Z (Compass)
                beta: event.beta,   // X (Front/Back)
                gamma: event.gamma  // Y (Left/Right)
            });

            document.getElementById('debug-vals').innerText =
                `A:${Math.round(event.alpha)} B:${Math.round(event.beta)} G:${Math.round(event.gamma)}`;
        }
    });
}
