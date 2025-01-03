const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = 3000;

let isPrivate = false; // Private mode status

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

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('A user connected');

    // Emit the current private mode status
    socket.emit('privateStatus', isPrivate);

    // Send all messages to the client
    function sendMessages(admin = false) {
        if (isPrivate && !admin) {
            // Do not send messages if private mode is enabled and the user is not an admin
            socket.emit('messages', []);
            return;
        }

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
            io.emit('messages', []); // Broadcast updated messages
            sendMessages();
        });
    });

    // Handle toggle private mode
    socket.on('setPrivateMode', (status) => {
        isPrivate = status; // Update private mode status
        io.emit('privateStatus', isPrivate); // Notify all clients
    });

    // Handle delete message
    socket.on('deleteMessage', (id) => {
        db.run('DELETE FROM messages WHERE id = ?', [id], (err) => {
            if (err) {
                console.error(err.message);
                return;
            }
            io.emit('messages', []); // Broadcast updated messages
            sendMessages();
        });
    });

    // Send messages to the client initially
    socket.on('getMessages', ({ admin }) => {
        sendMessages(admin);
    });

    // Send all messages when a client connects
    sendMessages(); // Default behavior for non-admin users

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`32Server running on http://localhost:${PORT}`);
});
