// Multiplayer System (Simulated P2P)
// This is a simplified version that works without a real server
// Uses localStorage for demo purposes - in production, use WebSockets

let players = {};
let localPlayerId = null;
let updateInterval = null;

function initMultiplayer() {
    localPlayerId = generatePlayerId();
    
    // Add local player
    players[localPlayerId] = {
        name: playerName,
        position: { x: 0, y: 5, z: 10 },
        color: getRandomColor()
    };
    
    // Create player mesh
    createPlayerMesh(localPlayerId);
    
    // Update player list
    updatePlayersList();
    
    // Start sync loop (simulated)
    updateInterval = setInterval(syncPlayers, 100);
    
    // Simulate other players joining (for demo)
    setTimeout(() => {
        simulatePlayerJoin('Bot_' + Math.floor(Math.random() * 1000));
    }, 3000);
}

function generatePlayerId() {
    return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getRandomColor() {
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
    return colors[Math.floor(Math.random() * colors.length)];
}

function createPlayerMesh(playerId) {
    const player = players[playerId];
    if (!player || player.mesh) return;
    
    // Create simple player representation (cube)
    const geometry = new THREE.BoxGeometry(0.8, 1.8, 0.8);
    const material = new THREE.MeshLambertMaterial({ color: player.color });
    const mesh = new THREE.Mesh(geometry, material);
    
    mesh.position.set(player.position.x, player.position.y, player.position.z);
    mesh.castShadow = true;
    
    // Add name tag
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    context.fillRect(0, 0, 256, 64);
    context.font = 'Bold 32px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.fillText(player.name, 128, 42);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.set(0, 1.5, 0);
    sprite.scale.set(2, 0.5, 1);
    
    mesh.add(sprite);
    
    if (playerId !== localPlayerId) {
        scene.add(mesh);
    }
    
    player.mesh = mesh;
}

function syncPlayers() {
    // Update local player position
    if (controls && controls.isLocked) {
        const pos = controls.getObject().position;
        players[localPlayerId].position = {
            x: Math.round(pos.x * 10) / 10,
            y: Math.round(pos.y * 10) / 10,
            z: Math.round(pos.z * 10) / 10
        };
    }
    
    // Update other players' meshes
    Object.keys(players).forEach(playerId => {
        if (playerId !== localPlayerId) {
            const player = players[playerId];
            if (player.mesh) {
                // Smooth movement
                player.mesh.position.lerp(
                    new THREE.Vector3(player.position.x, player.position.y, player.position.z),
                    0.1
                );
            }
        }
    });
}

function simulatePlayerJoin(name) {
    const newPlayerId = generatePlayerId();
    players[newPlayerId] = {
        name: name,
        position: { 
            x: Math.random() * 20 - 10, 
            y: 5, 
            z: Math.random() * 20 - 10 
        },
        color: getRandomColor()
    };
    
    createPlayerMesh(newPlayerId);
    updatePlayersList();
    addChatMessage('System', `${name} ist dem Raum beigetreten!`, true);
    
    // Simulate random movement
    setInterval(() => {
        if (players[newPlayerId]) {
            players[newPlayerId].position.x += (Math.random() - 0.5) * 0.5;
            players[newPlayerId].position.z += (Math.random() - 0.5) * 0.5;
        }
    }, 2000);
}

function updatePlayersList() {
    const playersList = document.getElementById('playersList');
    playersList.innerHTML = '';
    
    Object.keys(players).forEach(playerId => {
        const player = players[playerId];
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-item';
        playerDiv.textContent = player.name + (playerId === localPlayerId ? ' (Du)' : '');
        playersList.appendChild(playerDiv);
    });
    
    document.getElementById('playerCount').textContent = Object.keys(players).length;
}

// Block Updates
function sendBlockUpdate(action, x, y, z, type) {
    // In a real implementation, send to server/other clients
    // For demo, we just log it
    console.log(`Block ${action}:`, { x, y, z, type });
}

// Chat Messages
function sendChatMessage(message) {
    addChatMessage(playerName, message);
    
    // Simulate receiving messages from other players
    setTimeout(() => {
        const otherPlayers = Object.keys(players).filter(id => id !== localPlayerId);
        if (otherPlayers.length > 0) {
            const randomPlayer = players[otherPlayers[0]];
            const responses = [
                'Cool!',
                'Schönes Gebäude!',
                'Lass uns zusammen bauen!',
                'Hallo!',
                'Wo bist du?'
            ];
            addChatMessage(randomPlayer.name, responses[Math.floor(Math.random() * responses.length)]);
        }
    }, 2000);
}

// Cleanup
window.addEventListener('beforeunload', () => {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
});
