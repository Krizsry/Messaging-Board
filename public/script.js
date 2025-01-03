const socket = io();
const form = document.getElementById('messageForm');
const messagesDiv = document.getElementById('messages');
const adminLoginButton = document.getElementById('adminLogin');
const adminPanel = document.getElementById('adminPanel');
const togglePrivateButton = document.getElementById('togglePrivate');
const privateIndicator = document.getElementById('privateIndicator');

// Add notification element
const notificationDiv = document.createElement('div');
notificationDiv.id = 'notification';
document.body.appendChild(notificationDiv);

let isAdmin = false;
let isPrivate = false;

// Function to show a notification
function showNotification(message) {
    notificationDiv.textContent = message;
    notificationDiv.style.display = 'block';

    // Hide notification after 3 seconds
    setTimeout(() => {
        notificationDiv.style.display = 'none';
    }, 3000);
}

// Render messages
function renderMessages(messages, admin = false) {
    const messageHTML = messages.map(
        (msg) =>
            `<p>
                <strong>${msg.username || "Anonymous"}:</strong> 
                ${msg.message} 
                <span class="timestamp">${new Date(msg.timestamp).toLocaleString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                    month: 'short',
                    day: 'numeric',
                })}</span> 
                ${admin ? ` - IP: ${msg.ip}` : ""}
                ${admin ? `<button onclick="deleteMessage(${msg.id})">Delete</button>` : ""}
            </p>`
    ).reverse().join(""); // Show newest messages at the top

    if (admin) {
        document.getElementById('adminMessages').innerHTML = messageHTML;
    } else {
        messagesDiv.innerHTML = messageHTML;
    }
}

// Submit a new message
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value || "Anonymous";
    const message = document.getElementById('message').value;

    socket.emit('newMessage', { username, message });
    form.reset();

    // Show success notification
    showNotification('Message sent successfully!');
});

// Admin Login
adminLoginButton.addEventListener('click', () => {
    const password = prompt('Enter admin password:');
    if (password === 'admin123') {
        isAdmin = true;
        adminPanel.style.display = 'block';
        socket.emit('getMessages', { admin: true });
    } else {
        alert('Incorrect password');
    }
});

// Update private mode indicator
function updatePrivateStatus(isPrivate) {
    privateIndicator.textContent = isPrivate ? "On" : "Off";
}

// Toggle private mode
togglePrivateButton.addEventListener('click', () => {
    isPrivate = !isPrivate;
    socket.emit('setPrivateMode', isPrivate);
    updatePrivateStatus(isPrivate);
});

// Delete a message
function deleteMessage(id) {
    socket.emit('deleteMessage', id); // Emit a delete message event
}

// Listen for messages updates
socket.on('messages', (messages) => {
    if (!isPrivate || isAdmin) {
        renderMessages(messages, isAdmin);
    } else {
        messagesDiv.innerHTML = '<p>The message board is currently private.</p>';
    }
});

// Listen for private mode updates
socket.on('privateStatus', (status) => {
    isPrivate = status;
    updatePrivateStatus(isPrivate);
    if (!isAdmin && isPrivate) {
        messagesDiv.innerHTML = '<p>The message board is currently private.</p>';
    }
});

// Function to update the private mode indicator
function updatePrivateStatus(isPrivate) {
    privateIndicator.textContent = isPrivate ? "On" : "Off";
}

// Request all messages when the page loads
socket.emit('getMessages', { admin: isAdmin });

// Listen for messages from the server and render them
socket.on('messages', (messages) => {
    renderMessages(messages, isAdmin);
});



console.log()