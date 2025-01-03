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
    ).join(""); // Do NOT reverse; display as provided.

    // Insert messages in the correct order
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

// Admin toggles private mode
document.getElementById('togglePrivateMode').addEventListener('click', () => {
    const newStatus = !isPrivate; // Toggle the current status
    socket.emit('setPrivateMode', newStatus);
});


// Delete a message
function deleteMessage(id) {
    socket.emit('deleteMessage', id); // Emit a delete message event
}

const privateStatusDiv = document.createElement('div');
privateStatusDiv.id = 'privateStatus';
document.body.appendChild(privateStatusDiv);

// Listen for private mode status
socket.on('privateStatus', (status) => {
    const isPrivate = status;
    privateStatusDiv.textContent = isPrivate
        ? 'The chat board is currently private. Only admins can view messages.'
        : 'The chat board is public.';
    privateStatusDiv.style.color = isPrivate ? 'red' : 'green';
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
