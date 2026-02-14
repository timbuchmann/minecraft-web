// Real Multiplayer System using PeerJS (P2P)
// This allows real multiplayer without needing your own server!

let peer = null;
let connections = {};
let players = {};
let localPlayerId = null;
let roomCode = null;
let isHost = false;

function initMultiplayer() {
    localPlayerId = generatePlayerId();
    
    // Initialize PeerJS with public server
    peer = new Peer(localPlayerId, {
        host: '0.peerjs.com',
        secure: true,
        port: 443,
        config: {
            'iceServers': [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' }
            ]
        }
    });
    
    peer.on('open', (id) => {
        console.log('Connected with ID:', id);
        
        // Add local player
        players[localPlayerId] = {
            name: playerName,
            position: { x: 0, y: 5, z: 10 },
            rotation: { x: 0, y: 0 },
            color: getRandomColor(),
            isLocal: true
        };
        
        createPlayerMesh(localPlayerId);
        updatePlayersList();
        
        // Start position sync
        setInterval(broadcastPosition, 50);
    });
    
    peer.on('connection', (conn) => {
        handleConnection(conn);
    });
    
    peer.on('error', (err) => {
        console.error('PeerJS Error:', err);
        addChatMessage('System', 'Verbindungsfehler: ' + err.type, true);
    });
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
    
    // Create player body (Minecraft Steve style)
    const group = new THREE.Group();
    
    // Head
    const headGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const headMat = new THREE.MeshLambertMaterial({ color: player.color });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.9;
    head.castShadow = true;
    group.add(head);
    
    // Body
    const bodyGeo = new THREE.BoxGeometry(0.8, 1.2, 0.4);
    const body = new THREE.Mesh(bodyGeo, headMat);
    body.position.y = 0;
    body.castShadow = true;
    group.add(body);
    
    // Name tag
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    context.fillRect(0, 0, 256, 64);
    context.font = 'Bold 28px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.fillText(player.name, 128, 42);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.set(0, 2, 0);
    sprite.scale.set(2, 0.5, 1);
    group.add(sprite);
    
    group.position.set(player.position.x, player.position.y, player.position.z);
    
    if (playerId !== localPlayerId) {
        scene.add(group);
    }
    
    player.mesh = group;
}

function createRoom() {
    isHost = true;
    roomCode = generateRoomCode();
    document.getElementById('roomCode').textContent = roomCode;
    
    // Store room info in localStorage for others to find
    const roomData = {
        code: roomCode,
        hostId: localPlayerId,
        timestamp: Date.now()
    };
    localStorage.setItem('room_' + roomCode, JSON.stringify(roomData));
    
    addChatMessage('System', `Raum erstellt! Code: ${roomCode}`, true);
    return roomCode;
}

function joinRoom(code) {
    roomCode = code.toUpperCase();
    document.getElementById('roomCode').textContent = roomCode;
    
    // Get room info
    const roomData = localStorage.getItem('room_' + roomCode);
    if (!roomData) {
        addChatMessage('System', 'Raum nicht gefunden! Stelle sicher, dass der Host online ist.', true);
        return false;
    }
    
    const room = JSON.parse(roomData);
    const hostId = room.hostId;
    
    // Connect to host
    const conn = peer.connect(hostId, {
        reliable: true,
        serialization: 'json'
    });
    
    handleConnection(conn);
    
    conn.on('open', () => {
        // Send join request
        conn.send({
            type: 'join',
            playerId: localPlayerId,
            playerName: playerName,
            color: players[localPlayerId].color
        });
        
        addChatMessage('System', `Verbinde mit Raum ${roomCode}...`, true);
    });
    
    return true;
}

function handleConnection(conn) {
    const peerId = conn.peer;
    connections[peerId] = conn;
    
    conn.on('data', (data) => {
        handleMessage(data, peerId);
    });
    
    conn.on('close', () => {
        handlePlayerLeave(peerId);
    });
    
    conn.on('error', (err) => {
        console.error('Connection error:', err);
    });
}

function handleMessage(data, fromPeerId) {
    switch(data.type) {
        case 'join':
            // New player joined
            players[data.playerId] = {
                name: data.playerName,
                position: { x: 0, y: 5, z: 10 },
                rotation: { x: 0, y: 0 },
                color: data.color,
                isLocal: false
            };
            
            createPlayerMesh(data.playerId);
            updatePlayersList();
            addChatMessage('System', `${data.playerName} ist beigetreten!`, true);
            
            // If we're the host, share existing players
            if (isHost) {
                const conn = connections[fromPeerId];
                if (conn) {
                    // Send all existing players
                    Object.keys(players).forEach(playerId => {
                        if (playerId !== data.playerId) {
                            conn.send({
                                type: 'playerInfo',
                                playerId: playerId,
                                playerData: players[playerId]
                            });
                        }
                    });
                    
                    // Broadcast new player to others
                    broadcastToOthers({
                        type: 'playerInfo',
                        playerId: data.playerId,
                        playerData: players[data.playerId]
                    }, fromPeerId);
                }
            }
            break;
            
        case 'playerInfo':
            // Received info about another player
            if (!players[data.playerId]) {
                players[data.playerId] = {
                    name: data.playerData.name,
                    position: data.playerData.position,
                    rotation: data.playerData.rotation,
                    color: data.playerData.color,
                    isLocal: false
                };
                createPlayerMesh(data.playerId);
                updatePlayersList();
            }
            break;
            
        case 'position':
            // Update player position
            if (players[data.playerId]) {
                players[data.playerId].position = data.position;
                players[data.playerId].rotation = data.rotation;
            }
            break;
            
        case 'blockUpdate':
            // Sync block changes
            if (data.action === 'place') {
                placeBlockAt(data.x, data.y, data.z, data.blockType, false);
            } else if (data.action === 'remove') {
                removeBlockAt(data.x, data.y, data.z, false);
            }
            break;
            
        case 'chat':
            // Receive chat message
            addChatMessage(data.playerName, data.message);
            break;
    }
}

function handlePlayerLeave(peerId) {
    // Find and remove player
    let playerName = '';
    Object.keys(players).forEach(playerId => {
        if (playerId === peerId || connections[peerId]) {
            playerName = players[playerId].name;
            if (players[playerId].mesh) {
                scene.remove(players[playerId].mesh);
            }
            delete players[playerId];
        }
    });
    
    delete connections[peerId];
    updatePlayersList();
    
    if (playerName) {
        addChatMessage('System', `${playerName} hat den Raum verlassen.`, true);
    }
}

function broadcastPosition() {
    if (!controls || !controls.isLocked) return;
    
    const pos = controls.getObject().position;
    const rot = controls.getObject().rotation;
    
    players[localPlayerId].position = {
        x: Math.round(pos.x * 10) / 10,
        y: Math.round(pos.y * 10) / 10,
        z: Math.round(pos.z * 10) / 10
    };
    
    players[localPlayerId].rotation = {
        x: Math.round(rot.x * 100) / 100,
        y: Math.round(rot.y * 100) / 100
    };
    
    broadcast({
        type: 'position',
        playerId: localPlayerId,
        position: players[localPlayerId].position,
        rotation: players[localPlayerId].rotation
    });
    
    // Update other players' meshes
    updatePlayerMeshes();
}

function broadcast(data) {
    Object.values(connections).forEach(conn => {
        if (conn.open) {
            conn.send(data);
        }
    });
}

function broadcastToOthers(data, excludePeerId) {
    Object.keys(connections).forEach(peerId => {
        if (peerId !== excludePeerId && connections[peerId].open) {
            connections[peerId].send(data);
        }
    });
}

function updatePlayerMeshes() {
    Object.keys(players).forEach(playerId => {
        if (playerId !== localPlayerId && players[playerId].mesh) {
            const player = players[playerId];
            const targetPos = new THREE.Vector3(
                player.position.x,
                player.position.y,
                player.position.z
            );
            
            // Smooth movement
            player.mesh.position.lerp(targetPos, 0.3);
            
            // Update rotation
            if (player.rotation) {
                player.mesh.rotation.y = player.rotation.y;
            }
        }
    });
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

function sendBlockUpdate(action, x, y, z, blockType = null) {
    broadcast({
        type: 'blockUpdate',
        action: action,
        x: x,
        y: y,
        z: z,
        blockType: blockType
    });
}

function sendChatMessage(message) {
    addChatMessage(playerName, message);
    
    broadcast({
        type: 'chat',
        playerId: localPlayerId,
        playerName: playerName,
        message: message
    });
}

function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Cleanup
window.addEventListener('beforeunload', () => {
    if (peer) {
        broadcast({
            type: 'leave',
            playerId: localPlayerId
        });
        peer.destroy();
    }
});

