// ==========================================================
// SIMULADOR QUÍMICO AVANZADO - Ingeniería en Sistemas
// Core Lab Logic: Visual Bonds, Missions, Breakable Bonds
// ==========================================================

const videoElement = document.querySelector('.input_video');
const canvasElement = document.getElementById('lab-canvas');
const successCard = document.querySelector('.notification-card');
const successText = document.getElementById('success-text');

// UI Elements
const uiLevel = document.getElementById('level-ui');
const uiTitle = document.getElementById('title-ui');
const uiFormula = document.getElementById('formula-ui');
const uiDesc = document.getElementById('desc-ui');

// --- Game State ---
let grabbedAtom = null;
let atoms = [];
let bonds = []; // [{a, b, mesh}]
let currentLevel = 1;
let levelComplete = false;

const LEVELS = [
    {
        num: 1, title: 'Sintetiza Agua', formula: 'H₂O',
        desc: 'Une 2 átomos de Hidrógeno (blanco) a 1 de Oxígeno (rojo).',
        spawns: { H: 4, O: 2 },
        check: checkWater
    },
    {
        num: 2, title: 'Dióxido de Carbono', formula: 'CO₂',
        desc: 'Une 2 átomos de Oxígeno a 1 de Carbono (gris oscuro) usando enlaces dobles (2 conexiones c/u).',
        spawns: { C: 2, O: 4 },
        check: checkCO2
    },
    {
        num: 3, title: 'Gas Metano', formula: 'CH₄',
        desc: 'Satura 1 átomo de Carbono (gris) rodeándolo con 4 átomos de Hidrógeno (blanco).',
        spawns: { C: 1, H: 6 },
        check: checkMethane
    }
];

// --- Three.js Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a101f);
scene.fog = new THREE.FogExp2(0x0a101f, 0.03);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 12;

const renderer = new THREE.WebGLRenderer({ canvas: canvasElement, antialias: true }); // Alpha removed to FORCE dark bg
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x0a101f, 1);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const pointLight = new THREE.PointLight(0xffffff, 1.2);
pointLight.position.set(5, 8, 8);
scene.add(pointLight);

// --- Cursor ---
const cursorGeo = new THREE.TorusGeometry(0.3, 0.05, 16, 32);
const cursorMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.8 });
const cursorMesh = new THREE.Mesh(cursorGeo, cursorMat);
scene.add(cursorMesh);

let cursorPosition = new THREE.Vector3(0, 0, 0);
let isPinching = false;

// --- Physics Group for Completed Molecule Spin ---
const centerSpinGroup = new THREE.Group();
scene.add(centerSpinGroup);

// --- Builders ---
function getAtomProps(type) {
    if (type === 'H') return { r: 0.35, color: 0xeeeeee, maxBonds: 1 };
    if (type === 'O') return { r: 0.60, color: 0xff0044, maxBonds: 2 }; // Fixed Valency for this simple logic (O needs 2)
    if (type === 'C') return { r: 0.70, color: 0x555555, maxBonds: 4 };
    return { r: 0.4, color: 0xffffff, maxBonds: 1 };
}

function createAtom(type, x, y) {
    const props = getAtomProps(type);

    // Add specular highlight
    const geo = new THREE.SphereGeometry(props.r, 32, 32);
    const mat = new THREE.MeshPhongMaterial({
        color: props.color,
        shininess: 90,
        specular: 0x666666
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, 0);
    scene.add(mesh);

    const atom = {
        id: Math.random().toString(36).substr(2, 9),
        mesh: mesh,
        type: type,
        radius: props.r,
        maxBonds: props.maxBonds,
        velocity: new THREE.Vector3((Math.random() - 0.5) * 0.03, (Math.random() - 0.5) * 0.03, 0),
        bondedTo: [], // Arr of atom IDs
        isGrabbed: false
    };
    atoms.push(atom);
    return atom;
}

// Visual Cylinder for Bonds
function createBondVisual() {
    const geo = new THREE.CylinderGeometry(0.08, 0.08, 1, 8);
    // Rotate so it aligns along Z initially, helps when using lookAt later
    geo.rotateX(Math.PI / 2);
    const mat = new THREE.MeshPhongMaterial({ color: 0x00f3ff, emissive: 0x0044aa, transparent: true, opacity: 0.8 });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    return mesh;
}

// --- Level Manager ---
function loadLevel(levelIndex) {
    levelComplete = false;
    currentLevel = levelIndex;

    // Clean up old
    atoms.forEach(a => scene.remove(a.mesh));
    bonds.forEach(b => scene.remove(b.mesh));
    centerSpinGroup.clear();
    atoms = [];
    bonds = [];
    grabbedAtom = null;

    // Load UI
    const lv = LEVELS[levelIndex - 1];
    uiLevel.innerText = `NIVEL ${lv.num}`;
    uiTitle.innerText = lv.title;
    uiFormula.innerText = lv.formula;
    uiDesc.innerHTML = `${lv.desc}<br><br><i>Tira fuerte para romper enlaces.</i>`;

    // Spawn New Atoms
    Object.keys(lv.spawns).forEach(type => {
        const count = lv.spawns[type];
        for (let i = 0; i < count; i++) {
            createAtom(type, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 8);
        }
    });
}

loadLevel(1);

// --- Physics Engine ---
function getAtomById(id) {
    return atoms.find(a => a.id === id);
}

function canBond(a, b) {
    const aUsed = a.bondedTo.length;
    const bUsed = b.bondedTo.length;
    return aUsed < a.maxBonds && bUsed < b.maxBonds;
}

function bondAtoms(a, b) {
    if (!canBond(a, b)) return;
    a.bondedTo.push(b.id);
    b.bondedTo.push(a.id);

    bonds.push({
        a: a.id,
        b: b.id,
        mesh: createBondVisual()
    });
}

function breakBonds(atom) {
    // Remove all bonds connected to this atom
    for (let i = bonds.length - 1; i >= 0; i--) {
        const b = bonds[i];
        if (b.a === atom.id || b.b === atom.id) {
            scene.remove(b.mesh);
            bonds.splice(i, 1);

            // Remove from atom neighbor lists
            const otherId = b.a === atom.id ? b.b : b.a;
            const otherAtom = getAtomById(otherId);

            atom.bondedTo = atom.bondedTo.filter(id => id !== otherId);
            if (otherAtom) otherAtom.bondedTo = otherAtom.bondedTo.filter(id => id !== atom.id);
        }
    }
}

function animate() {
    requestAnimationFrame(animate);

    if (levelComplete) {
        // Spin the completed molecule triumphantly
        centerSpinGroup.rotation.y += 0.02;
        centerSpinGroup.rotation.x += 0.01;
        renderer.render(scene, camera);
        return;
    }

    // Cursor Visual
    cursorMesh.position.lerp(cursorPosition, 0.3);
    cursorMesh.rotation.x += 0.05;
    cursorMesh.rotation.y += 0.05;

    if (isPinching) {
        cursorMesh.material.color.setHex(0xffaa00);
        cursorMesh.scale.setScalar(0.7);
    } else {
        cursorMesh.material.color.setHex(0x00f3ff);
        cursorMesh.scale.setScalar(1);
    }

    // Grab Logic
    if (isPinching && !grabbedAtom) {
        let closest = null;
        let minDist = 1.8; // Grab range
        atoms.forEach(atom => {
            const dist = atom.mesh.position.distanceTo(cursorPosition);
            if (dist < minDist) {
                minDist = dist;
                closest = atom;
            }
        });
        if (closest) grabbedAtom = closest;

    } else if (!isPinching && grabbedAtom) {
        grabbedAtom = null;
    }

    // Update Atoms Positioning
    atoms.forEach(atom => {
        if (atom === grabbedAtom) {
            atom.mesh.position.lerp(cursorPosition, 0.2);
            atom.velocity.set(0, 0, 0);
        } else if (atom.bondedTo.length === 0) {
            // Float around
            atom.mesh.position.add(atom.velocity);
            if (atom.mesh.position.x > 10 || atom.mesh.position.x < -10) atom.velocity.x *= -1;
            if (atom.mesh.position.y > 6 || atom.mesh.position.y < -6) atom.velocity.y *= -1;
        }
    });

    // Resolve Constraints (Spring Physics for Bonds)
    const iterations = 3;
    const breakForceDist = 3.5; // If pulled further than this, bond snaps

    for (let k = 0; k < iterations; k++) {
        bonds.forEach(bond => {
            const a = getAtomById(bond.a);
            const b = getAtomById(bond.b);
            if (!a || !b) return;

            const targetDist = a.radius + b.radius + 0.3; // Rest length
            const diff = new THREE.Vector3().subVectors(b.mesh.position, a.mesh.position);
            const currentDist = diff.length();

            // Breaking logic (only if user is grabbing and pulling hard)
            if (currentDist > breakForceDist && (a === grabbedAtom || b === grabbedAtom)) {
                breakBonds(a === grabbedAtom ? a : b);
                return;
            }

            if (currentDist === 0) return;

            const correction = diff.normalize().multiplyScalar((currentDist - targetDist) * 0.1);

            if (a === grabbedAtom) b.mesh.position.sub(correction);
            else if (b === grabbedAtom) a.mesh.position.add(correction);
            else {
                a.mesh.position.add(correction.clone().multiplyScalar(0.5));
                b.mesh.position.sub(correction.clone().multiplyScalar(0.5));
            }
        });
    }

    // Update Bond Visuals (Cylinders connecting atoms)
    bonds.forEach(bond => {
        const a = getAtomById(bond.a);
        const b = getAtomById(bond.b);
        if (!a || !b) return;

        const pos = new THREE.Vector3().addVectors(a.mesh.position, b.mesh.position).multiplyScalar(0.5);
        bond.mesh.position.copy(pos);

        const dist = a.mesh.position.distanceTo(b.mesh.position);
        bond.mesh.scale.set(1, 1, dist);

        // Orient cylinder from a to b
        bond.mesh.lookAt(b.mesh.position);
    });

    // Check Auto-Bonding (if close enough and valency fits)
    if (grabbedAtom) {
        atoms.forEach(other => {
            if (other === grabbedAtom) return;
            const dist = grabbedAtom.mesh.position.distanceTo(other.mesh.position);
            const bondDistRequired = grabbedAtom.radius + other.radius + 0.5;

            // Check if they are NOT already bonded
            if (dist < bondDistRequired && !grabbedAtom.bondedTo.includes(other.id)) {
                bondAtoms(grabbedAtom, other);
            }
        });
    }

    // Check Victory Condition
    if (!levelComplete && frameCount % 30 === 0) {
        LEVELS[currentLevel - 1].check();
    }

    renderer.render(scene, camera);
}

let frameCount = 0;
setInterval(() => { frameCount++; }, 16);
animate();

// --- Validation Logic (Level Checks) ---
function markVictory(moleculeAtomsList) {
    levelComplete = true;
    grabbedAtom = null;

    // Reparent winning atoms/bonds to center spin group
    const winningIds = moleculeAtomsList.map(a => a.id);

    // Calculate center mass
    let center = new THREE.Vector3();
    moleculeAtomsList.forEach(a => center.add(a.mesh.position));
    center.divideScalar(moleculeAtomsList.length);

    moleculeAtomsList.forEach(a => {
        a.mesh.position.sub(center); // Localize
        centerSpinGroup.add(a.mesh);
    });

    bonds.forEach(b => {
        if (winningIds.includes(b.a) && winningIds.includes(b.b)) {
            b.mesh.position.sub(center);
            centerSpinGroup.add(b.mesh);
        } else {
            // Hide other bonds
            b.mesh.visible = false;
        }
    });

    // Hide losing atoms
    atoms.forEach(a => {
        if (!winningIds.includes(a.id)) a.mesh.visible = false;
    });

    // Show Card
    successCard.classList.add('active');
    setTimeout(() => {
        successCard.classList.remove('active');
        if (currentLevel < LEVELS.length) {
            loadLevel(currentLevel + 1);
        } else {
            successText.innerText = "¡LABORATORIO COMPLETADO!";
            // Reset to 1 after long delay
            setTimeout(() => loadLevel(1), 5000);
        }
    }, 4000);
}

// Lvl 1: H2O
function checkWater() {
    const oxygens = atoms.filter(a => a.type === 'O');
    for (let o of oxygens) {
        // Find 2 distinct H bonded to this O
        const bondedH = o.bondedTo.map(id => getAtomById(id)).filter(a => a && a.type === 'H');
        if (bondedH.length >= 2) {
            markVictory([o, bondedH[0], bondedH[1]]);
            return;
        }
    }
}

// Lvl 2: CO2
function checkCO2() {
    const carbons = atoms.filter(a => a.type === 'C');
    for (let c of carbons) {
        const bondedO = c.bondedTo.map(id => getAtomById(id)).filter(a => a && a.type === 'O');

        // C needs to be bonded to exactly 2 Oxygens. 
        // Note: In our simple system, an edge is an edge. Real CO2 has double bonds (4 edges total).
        // Since O maxBonds=2 and C=4, they can form 2 distinct bonds to each other automatically if dragged close twice!
        // For simulation leniency, we just require 1 C connected to 2 distinct O atoms.

        // Remove duplicates visually (if they double bonded)
        const uniqueO = [...new Set(bondedO)];

        if (uniqueO.length >= 2) {
            markVictory([c, uniqueO[0], uniqueO[1]]);
            return;
        }
    }
}

// Lvl 3: CH4 (Metano)
function checkMethane() {
    const carbons = atoms.filter(a => a.type === 'C');
    for (let c of carbons) {
        const bondedH = c.bondedTo.map(id => getAtomById(id)).filter(a => a && a.type === 'H');
        if (bondedH.length >= 4) {
            markVictory([c, bondedH[0], bondedH[1], bondedH[2], bondedH[3]]);
            return;
        }
    }
}

// --- Interaction / Controls ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- MediaPipe Hand Recognition ---
const hands = new Hands({ locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 0,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6
});

hands.onResults((results) => {
    if (levelComplete) { cursorMesh.visible = false; return; }

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        cursorMesh.visible = true;
        const landmarks = results.multiHandLandmarks[0];

        // Map Index
        const indexTip = landmarks[8];
        const thumbTip = landmarks[4];

        // Mirror X
        const x = (0.5 - indexTip.x) * 25;
        const y = (0.5 - indexTip.y) * 14;

        cursorPosition.set(x, y, 0);

        // Pinch Detection 
        const dx = indexTip.x - thumbTip.x;
        const dy = indexTip.y - thumbTip.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.06) isPinching = true;
        else if (dist > 0.09) isPinching = false;

    } else {
        isPinching = false;
        cursorMesh.visible = false; // Hide if no hand
    }
});

const cameraUtils = new Camera(videoElement, {
    onFrame: async () => { await hands.send({ image: videoElement }); },
    width: 640, height: 480
});
cameraUtils.start();
