// Game Variables
let scene, camera, renderer, controls;
let world = [];
let selectedBlock = 'grass';
let playerName = '';
let roomCode = '';
let isHost = false;

const BLOCK_SIZE = 1;
const WORLD_SIZE = 20;
const RENDER_DISTANCE = 50;

// Block Types
const blockTypes = {
    grass: { color: 0x7ec850, topColor: 0x7ec850, sideColor: 0x8b6f47 },
    dirt: { color: 0x8b6f47 },
    stone: { color: 0x808080 },
    wood: { color: 0x8b4513 },
    sand: { color: 0xf4a460 },
    water: { color: 0x4a90e2, transparent: true, opacity: 0.7 }
};

// Movement
const moveSpeed = 0.1;
const sprintSpeed = 0.2;
const jumpSpeed = 0.3;
let velocity = new THREE.Vector3();
let canJump = false;
const keys = {};

// Raycaster for block interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Initialize Game
function initGame() {
    // Setup Three.js scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 0, RENDER_DISTANCE);

    // Camera
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 10, 10);

    // Renderer
    const canvas = document.getElementById('gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Pointer Lock Controls
    controls = new THREE.PointerLockControls(camera, document.body);
    scene.add(controls.getObject());

    canvas.addEventListener('click', () => {
        controls.lock();
    });

    // Generate initial world
    generateWorld();

    // Event listeners
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Start animation loop
    animate();
}

// Generate World
function generateWorld() {
    // Create ground
    for (let x = -WORLD_SIZE; x < WORLD_SIZE; x++) {
        for (let z = -WORLD_SIZE; z < WORLD_SIZE; z++) {
            const height = Math.floor(Math.random() * 2);
            for (let y = 0; y <= height; y++) {
                const blockType = y === height ? 'grass' : 'dirt';
                addBlock(x, y, z, blockType, false);
            }
        }
    }

    // Add some trees
    for (let i = 0; i < 10; i++) {
        const x = Math.floor(Math.random() * WORLD_SIZE * 2) - WORLD_SIZE;
        const z = Math.floor(Math.random() * WORLD_SIZE * 2) - WORLD_SIZE;
        createTree(x, 2, z);
    }
}

function createTree(x, y, z) {
    // Trunk
    for (let i = 0; i < 4; i++) {
        addBlock(x, y + i, z, 'wood', false);
    }
    // Leaves
    for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
            for (let dy = 0; dy < 2; dy++) {
                if (Math.abs(dx) + Math.abs(dz) < 4) {
                    addBlock(x + dx, y + 4 + dy, z + dz, 'grass', false);
                }
            }
        }
    }
}

// Add Block
function addBlock(x, y, z, type, sync = true) {
    const blockData = blockTypes[type];
    
    let geometry = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    let material;

    if (type === 'grass') {
        // Grass block with different top
        const materials = [
            new THREE.MeshLambertMaterial({ color: blockData.sideColor }), // right
            new THREE.MeshLambertMaterial({ color: blockData.sideColor }), // left
            new THREE.MeshLambertMaterial({ color: blockData.topColor }), // top
            new THREE.MeshLambertMaterial({ color: blockData.sideColor }), // bottom
            new THREE.MeshLambertMaterial({ color: blockData.sideColor }), // front
            new THREE.MeshLambertMaterial({ color: blockData.sideColor })  // back
        ];
        material = materials;
    } else {
        material = new THREE.MeshLambertMaterial({ 
            color: blockData.color,
            transparent: blockData.transparent || false,
            opacity: blockData.opacity || 1
        });
    }

    const block = new THREE.Mesh(geometry, material);
    block.position.set(x, y, z);
    block.castShadow = true;
    block.receiveShadow = true;
    block.userData = { type, x, y, z };
    
    scene.add(block);
    world.push(block);

    if (sync && typeof sendBlockUpdate === 'function') {
        sendBlockUpdate('add', x, y, z, type);
    }

    return block;
}

// Remove Block
function removeBlock(block, sync = true) {
    if (!block) return;
    
    const { x, y, z } = block.userData;
    scene.remove(block);
    const index = world.indexOf(block);
    if (index > -1) {
        world.splice(index, 1);
    }

    if (sync && typeof sendBlockUpdate === 'function') {
        sendBlockUpdate('remove', x, y, z);
    }
}

// Helper functions for multiplayer
function placeBlockAt(x, y, z, type, sync = true) {
    addBlock(x, y, z, type, sync);
}

function removeBlockAt(x, y, z, sync = true) {
    const block = world.find(b => b.userData.x === x && b.userData.y === y && b.userData.z === z);
    if (block) {
        removeBlock(block, sync);
    }
}

// Mouse Interaction
function onMouseDown(event) {
    if (!controls.isLocked) return;

    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(world);

    if (intersects.length > 0) {
        const intersect = intersects[0];
        
        if (event.button === 0) {
            // Left click - remove block
            removeBlock(intersect.object);
        } else if (event.button === 2) {
            // Right click - place block
            const normal = intersect.face.normal;
            const newPos = intersect.object.position.clone().add(normal);
            addBlock(newPos.x, newPos.y, newPos.z, selectedBlock);
        }
    }
}

// Block Selection
function selectBlock(type) {
    selectedBlock = type;
    document.querySelectorAll('.block-item').forEach(item => {
        item.classList.remove('selected');
    });
    document.querySelector(`[data-block="${type}"]`).classList.add('selected');
}

// Keyboard Controls
function onKeyDown(event) {
    keys[event.code] = true;
}

function onKeyUp(event) {
    keys[event.code] = false;
}

// Movement Update
function updateMovement() {
    if (!controls.isLocked) return;

    const speed = keys['ShiftLeft'] ? sprintSpeed : moveSpeed;
    
    velocity.x -= velocity.x * 10.0 * 0.016;
    velocity.z -= velocity.z * 10.0 * 0.016;
    velocity.y -= 9.8 * 0.016; // Gravity

    const direction = new THREE.Vector3();
    
    if (keys['KeyW']) direction.z -= 1;
    if (keys['KeyS']) direction.z += 1;
    if (keys['KeyA']) direction.x -= 1;
    if (keys['KeyD']) direction.x += 1;

    if (keys['Space'] && canJump) {
        velocity.y = jumpSpeed;
        canJump = false;
    }

    direction.normalize();
    
    if (direction.z !== 0) {
        velocity.z -= direction.z * speed;
    }
    if (direction.x !== 0) {
        velocity.x -= direction.x * speed;
    }

    controls.moveRight(-velocity.x);
    controls.moveForward(-velocity.z);
    controls.getObject().position.y += velocity.y;

    // Ground collision
    if (controls.getObject().position.y < 5) {
        velocity.y = 0;
        controls.getObject().position.y = 5;
        canJump = true;
    }
}

// Animation Loop
function animate() {
    requestAnimationFrame(animate);
    updateMovement();
    renderer.render(scene, camera);
}

// Window Resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// UI Functions
function createRoom() {
    const name = document.getElementById('playerName').value.trim();
    if (!name) {
        alert('Bitte gib deinen Namen ein!');
        return;
    }
    
    playerName = name;
    roomCode = generateRoomCode();
    isHost = true;
    
    startGame();
}

function showJoinRoom() {
    document.getElementById('joinRoomDiv').style.display = 'block';
}

function joinRoom() {
    const name = document.getElementById('playerName').value.trim();
    const code = document.getElementById('roomCode').value.trim().toUpperCase();
    
    if (!name || !code) {
        alert('Bitte gib deinen Namen und den Raum-Code ein!');
        return;
    }
    
    playerName = name;
    roomCode = code;
    isHost = false;
    
    startGame();
}

function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function startGame() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';
    
    initGame();
    initMultiplayer();
    
    // Create or join room after multiplayer is initialized
    setTimeout(() => {
        if (isHost) {
            const code = window.createRoom();
            addChatMessage('System', `Willkommen ${playerName}! Raum erstellt!`, true);
        } else {
            window.joinRoom(roomCode);
            addChatMessage('System', `Willkommen ${playerName}! Verbinde mit Raum...`, true);
        }
    }, 500);
    
    selectBlock('grass');
}

function copyRoomCode() {
    navigator.clipboard.writeText(roomCode);
    alert('Raum-Code kopiert: ' + roomCode);
}

// Chat Functions
function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (message && typeof sendChatMessage === 'function') {
        sendChatMessage(message);
        input.value = '';
    }
}

function addChatMessage(player, message, isSystem = false) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = isSystem ? 'chat-message system' : 'chat-message';
    
    if (isSystem) {
        messageDiv.textContent = message;
    } else {
        messageDiv.innerHTML = `<span class="player-name">${player}:</span> ${message}`;
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Enter key for chat
document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
});
