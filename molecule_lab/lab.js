const videoElement = document.querySelector('.input_video');
const canvasElement = document.getElementById('lab-canvas');
const successCard = document.getElementById('success-card');

// --- Game State ---
let grabbedAtom = null;
let formedMolecules = 0;
const atoms = [];
const bonds = []; // Visual lines between bonded atoms

// --- Three.js Setup ---
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a0a15, 0.02);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 10;

const renderer = new THREE.WebGLRenderer({ canvas: canvasElement, alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const pointLight = new THREE.PointLight(0xffffff, 1);
pointLight.position.set(5, 5, 5);
scene.add(pointLight);

// --- Cursor (Hand Representation) ---
const cursorMesh = new THREE.Mesh(
    new THREE.RingGeometry(0.2, 0.25, 32),
    new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 })
);
scene.add(cursorMesh);
let cursorPosition = new THREE.Vector3(0, 0, 0);
let isPinching = false;

// --- Atom Builder ---
function createAtom(type, x, y) {
    const radius = type === 'H' ? 0.3 : 0.5;
    const color = type === 'H' ? 0xeeeeee : 0xff4444; // White for H, Red for O

    const geo = new THREE.SphereGeometry(radius, 32, 32);
    const mat = new THREE.MeshPhongMaterial({
        color: color,
        shininess: 100,
        specular: 0xffffff
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, 0);

    // Label
    // (Skipping text sprite for simplicity in this version, relying on color)

    scene.add(mesh);

    const atom = {
        mesh: mesh,
        type: type,
        radius: radius,
        velocity: new THREE.Vector3((Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02, 0),
        bondedTo: [], // list of other atoms
        isGrabbed: false
    };
    atoms.push(atom);
    return atom;
}

// Spawn Initial Atoms for H2O
function spawnLevel() {
    // 4 Hydrogens, 2 Oxygens (Enough for 2 Water molecules)
    for (let i = 0; i < 4; i++) createAtom('H', (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 5);
    for (let i = 0; i < 2; i++) createAtom('O', (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 5);
}
spawnLevel();


// --- Physics & Interaction Loop ---
function animate() {
    requestAnimationFrame(animate);

    // Update Cursor Visual
    cursorMesh.position.copy(cursorPosition);
    if (isPinching) {
        cursorMesh.material.color.setHex(0xffaa00); // Orange when pinching
        cursorMesh.scale.setScalar(0.8);
    } else {
        cursorMesh.material.color.setHex(0x00ffff); // Cyan normal
        cursorMesh.scale.setScalar(1);
    }

    // Update Atoms
    atoms.forEach(atom => {
        if (atom.isGrabbed) {
            // Follow cursor smoothly
            atom.mesh.position.lerp(cursorPosition, 0.2);
            atom.velocity.set(0, 0, 0);
        } else if (atom.bondedTo.length === 0) {
            // Floating physics
            atom.mesh.position.add(atom.velocity);

            // Bounce off walls (roughly 16:9 aspect at z=10)
            if (atom.mesh.position.x > 8 || atom.mesh.position.x < -8) atom.velocity.x *= -1;
            if (atom.mesh.position.y > 4.5 || atom.mesh.position.y < -4.5) atom.velocity.y *= -1;
        } else {
            // Bonded physics (spring-like constraint could be added here, currently rigid)
            // Just let the parent control or use group logic? 
            // For MVP, we won't do complex molecular physics update here, assume static bonds after creation or rigid structure.
        }
    });

    // Check Grabbing
    if (isPinching && !grabbedAtom) {
        // Find closest atom
        let closest = null;
        let minDist = 1.0; // Grabbing range

        atoms.forEach(atom => {
            const dist = atom.mesh.position.distanceTo(cursorPosition);
            if (dist < minDist) {
                minDist = dist;
                closest = atom;
            }
        });

        if (closest) {
            grabbedAtom = closest;
            closest.isGrabbed = true;
        }
    } else if (!isPinching && grabbedAtom) {
        // Release
        grabbedAtom.isGrabbed = false;
        grabbedAtom = null;
    }

    // Check Reactions (Collisions)
    // Only check if we are holding an atom and dragging it into another
    if (grabbedAtom) {
        atoms.forEach(other => {
            if (other === grabbedAtom) return;
            // Don't bond if already fully bonded (simplified valency: H=1, O=2)
            if (getValency(grabbedAtom) <= 0 || getValency(other) <= 0) return;

            const dist = grabbedAtom.mesh.position.distanceTo(other.mesh.position);
            const bondDist = grabbedAtom.radius + other.radius;

            if (dist < bondDist * 1.2) {
                // BOND!
                createBond(grabbedAtom, other);
            }
        });
    }

    drawBonds();

    renderer.render(scene, camera);
}
animate();

function getValency(atom) {
    // Current bonds
    const current = atom.bondedTo.length;
    // Max capacity
    const max = atom.type === 'H' ? 1 : 2;
    return max - current;
}

function createBond(a, b) {
    if (a.bondedTo.includes(b)) return; // Already bonded

    // Connect logic
    a.bondedTo.push(b);
    b.bondedTo.push(a);

    // Snap visually (simplified)
    // In a real robust system we'd merge them into a rigorous group object

    // Check for Water (H-O-H)
    checkWaterDisplay();
}

function checkWaterDisplay() {
    // Find any Oxygen with 2 Hydrogens
    const oxygens = atoms.filter(a => a.type === 'O');

    oxygens.forEach(o => {
        if (o.bondedTo.length === 2 && o.bondedTo[0].type === 'H' && o.bondedTo[1].type === 'H') {
            // SUCCESS!
            // Change color to Blue
            o.mesh.material.color.setHex(0x0066ff);
            o.bondedTo[0].mesh.material.color.setHex(0x00aaff);
            o.bondedTo[1].mesh.material.color.setHex(0x00aaff);

            if (!successCard.classList.contains('active')) {
                successCard.classList.add('active');
                setTimeout(() => successCard.classList.remove('active'), 3000);
            }
        }
    });
}

function drawBonds() {
    // Simple line drawing for bonds
    // In Three.js, we usually create line meshes. 
    // Ideally we store bond meshes in a list and update them.
    // Hacky immediate mode:

    // Clear old lines (expensive but okay for MVP with < 10 atoms)
    // A better way for MVP:
    // We didn't setup a LineSegments logic. Let's skip drawing lines for now or rely on them sticking close.
    // Actually, sticking close is hard without physics. 
    // Let's force position update for bonded pairs if one moves?

    // Simple constraint solver:
    atoms.forEach(atom => {
        atom.bondedTo.forEach(partner => {
            // If atom is grabbed, pull partner.
            const targetDist = atom.radius + partner.radius;
            const currentDist = atom.mesh.position.distanceTo(partner.mesh.position);

            if (currentDist > targetDist * 1.1) {
                // Pull partner towards atom
                const dir = new THREE.Vector3().subVectors(partner.mesh.position, atom.mesh.position).normalize();
                const idealPos = atom.mesh.position.clone().add(dir.multiplyScalar(targetDist));
                partner.mesh.position.lerp(idealPos, 0.1);
                // This is a very basic constraint loop
            }
        });
    });
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});


// --- MediaPipe Logic ---
function onResults(results) {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];

        // 1. Map Index Finger Tip to World Coordinates
        const indexTip = landmarks[8];
        const thumbTip = landmarks[4];

        // Map 0..1 to Screen World Coords roughly at Z=0 plane
        // Camera Z=10. FOV 75.
        // Approx range [-8, 8] X, [-4.5, 4.5] Y

        const x = (0.5 - indexTip.x) * 16; // Mirroring X
        const y = (0.5 - indexTip.y) * 9;

        cursorPosition.set(x, y, 0);

        // 2. Detect Pinch
        // Distance between Index(8) and Thumb(4) in roughly normalized screen space
        // Actually need 3D dist or raw landmark dist
        // Raw landmark dist is independent of screen projection
        const dx = indexTip.x - thumbTip.x;
        const dy = indexTip.y - thumbTip.y; // Aspect ratio adjustment needed for true dist but raw is fine approximation
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.05) isPinching = true;
        else if (dist > 0.08) isPinching = false; // Hysteresis

    } else {
        isPinching = false;
        // Optionally hide cursor
    }
}

const hands = new Hands({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }
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
        await hands.send({ image: videoElement });
    },
    width: 640,
    height: 480
});

cameraUtils.start();
