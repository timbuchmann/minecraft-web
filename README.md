# Minecraft Web - Multiplayer Browser Game

## 🎮 Beschreibung
Ein Minecraft-ähnliches 3D-Spiel, das direkt im Browser läuft. Spieler können Räume erstellen und andere Spieler mit einem Einladungscode einladen!

## ✨ Features

### 🎯 Gameplay
- **3D Voxel-Welt** - Minecraft-ähnliche Block-Welt
- **6 Block-Typen**: Gras, Erde, Stein, Holz, Sand, Wasser
- **Blöcke platzieren** - Rechtsklick zum Bauen
- **Blöcke entfernen** - Linksklick zum Abbauen
- **Prozedural generierte Welt** - Mit Bäumen und Hügeln

### 👥 Multiplayer
- **Raum-System** - Erstelle eigene Räume
- **Einladungscodes** - 6-stellige Codes zum Teilen
- **Echtzeit-Synchronisation** - Sieh andere Spieler in Echtzeit
- **Spielerliste** - Übersicht aller Spieler im Raum
- **Chat-System** - Kommuniziere mit anderen Spielern

### 🎮 Steuerung
- **Maus** - Umsehen
- **WASD** - Bewegen
- **Leertaste** - Springen
- **Shift** - Schneller laufen
- **Linksklick** - Block entfernen
- **Rechtsklick** - Block platzieren
- **1-6** - Block-Typ auswählen (oder UI nutzen)

## 🚀 Installation & Start

### Methode 1: Direkt öffnen (Einfachste Methode)
1. Doppelklick auf `index.html`
2. Das Spiel öffnet sich im Browser
3. Fertig!

### Methode 2: Mit lokalem Server (Empfohlen)

#### Option A: Python
```bash
# Im Projektordner:
python -m http.server 8000
# Dann Browser öffnen: http://localhost:8000
```

#### Option B: Node.js (http-server)
```bash
npm install -g http-server
http-server -p 8000
# Dann Browser öffnen: http://localhost:8000
```

#### Option C: VS Code Live Server
1. Installiere "Live Server" Extension
2. Rechtsklick auf index.html
3. "Open with Live Server"

## 🎮 Wie man spielt

### Raum erstellen
1. Gib deinen Namen ein
2. Klicke "Neuen Raum erstellen"
3. Dein Raum-Code wird oben angezeigt
4. Teile den Code mit Freunden!

### Raum beitreten
1. Gib deinen Namen ein
2. Klicke "Raum beitreten"
3. Gib den 6-stelligen Code ein
4. Klicke "Beitreten"

### Bauen
1. Wähle einen Block-Typ aus der Leiste unten
2. Klicke ins Spiel, um die Maus zu sperren
3. Rechtsklick = Block platzieren
4. Linksklick = Block entfernen
5. ESC = Maus freigeben

## 📦 Projektstruktur

```
MinecraftWeb/
├── index.html          # Haupt-HTML-Datei
├── style.css           # Styling
├── game.js             # Spiel-Logik & 3D-Engine
├── multiplayer.js      # Multiplayer-System
└── README.md           # Diese Datei
```

## 🛠️ Technologien

- **Three.js** - 3D-Grafik-Engine
- **JavaScript** - Spiel-Logik
- **HTML5 Canvas** - Rendering
- **CSS3** - UI-Design
- **PointerLockControls** - First-Person-Steuerung

## 🐛 Bekannte Einschränkungen

- **Multiplayer ist simuliert**: Die aktuelle Version nutzt keine echten WebSockets. Für echtes Multiplayer müsste ein Node.js-Server mit Socket.io implementiert werden.
- **Keine Persistenz**: Welten werden nicht gespeichert
- **Lokales Spiel**: Funktioniert am besten lokal

## 🚀 Zukünftige Verbesserungen

Für echtes Online-Multiplayer:

1. **WebSocket-Server** implementieren:
```javascript
// server.js (Node.js + Socket.io)
const io = require('socket.io')(3000);

io.on('connection', (socket) => {
    socket.on('join-room', (roomCode) => {
        socket.join(roomCode);
    });
    
    socket.on('block-update', (data) => {
        socket.to(data.roomCode).emit('block-update', data);
    });
});
```

2. **Datenbank** für Welt-Speicherung
3. **Authentifizierung** für Spieler
4. **Mehr Block-Typen** und Items
5. **Inventar-System**
6. **Crafting-System**

## 📝 Lizenz

Dieses Projekt ist für Bildungszwecke erstellt.

## 👍 Credits

- Three.js Team für die 3D-Engine
- Minecraft für die Inspiration

## 💬 Support

Bei Fragen oder Problemen:
1. Überprüfe die Browser-Konsole (F12)
2. Stelle sicher, dass JavaScript aktiviert ist
3. Nutze einen modernen Browser (Chrome, Firefox, Edge)

---

**Viel Spaß beim Bauen! 🏭**
