const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = 3000;

let isPrivate = false;

// SQLite Database Setup
const db = new sqlite3.Database('./messages.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
        db.run(`
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT,
                message TEXT NOT NULL,
                ip TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Trust proxy for correct IP retrieval when deployed
app.set('trust proxy', true);

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('A user connected');

    // Send all messages to the client
    function sendMessages(admin = false) {
        const query = admin
            ? 'SELECT * FROM messages ORDER BY timestamp DESC'
            : 'SELECT id, username, message, timestamp FROM messages ORDER BY timestamp DESC';
        db.all(query, [], (err, rows) => {
            if (err) {
                console.error(err.message);
                return;
            }
            socket.emit('messages', rows);
        });
    }

    // Handle new messages
    socket.on('newMessage', (data) => {
        const ip = socket.handshake.address;
        const query = `INSERT INTO messages (username, message, ip) VALUES (?, ?, ?)`;
        db.run(query, [data.username, data.message, ip], function (err) {
            if (err) {
                console.error(err.message);
                return;
            }
            if (!isPrivate || data.admin) {
                io.emit('messages', []); // Broadcast the updated messages
                sendMessages();
            }
        });
    });

    // Emit current private mode status to the client
    socket.emit('privateStatus', isPrivate);

    // Admin toggles private mode
    socket.on('setPrivateMode', (status) => {
        isPrivate = status;
        io.emit('privateStatus', isPrivate); // Notify all clients about the change
        console.log(`Private mode is now ${isPrivate ? 'enabled' : 'disabled'}`);
    });

    // Send messages to the client initially
    socket.on('getMessages', ({ admin }) => {
        if (!isPrivate || admin) {
            sendMessages(admin);
        } else {
            socket.emit('messages', []); // Send an empty list to non-admins
        }
    });

    // Handle delete message
    socket.on('deleteMessage', (id) => {
        db.run('DELETE FROM messages WHERE id = ?', [id], (err) => {
            if (err) {
                console.error(err.message);
                return;
            }
            io.emit('messages', []); // Update all clients
            sendMessages();
        });
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
