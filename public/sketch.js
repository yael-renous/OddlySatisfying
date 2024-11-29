let socket;
let currentRole = null;
let interactions = {
    controller: {
        x: 400,
        y: 300,
        size: 50
    },
    speaker: {
        volume: 50
    },
    commenter: {
        messages: []
    },
    stickers: {
        placed: []
    },
    emoji: {
        current: null
    }
};

function setup() {
    const canvas = createCanvas(800, 600);
    canvas.parent('canvas-container');
    
    socket = io();
    
    socket.on('assignRole', (role) => {
        currentRole = role;
        updateStatusDisplay();
        setupRoleSpecificListeners();
    });

    socket.on('roleUpdate', (users) => {
        // Update UI to show all users and their roles
        updateUsersList(users);
    });

    socket.on('viewInteraction', (data) => {
        handleInteraction(data);
    });
}

function updateStatusDisplay() {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = `Your role: ${currentRole.name}`;
}

function setupRoleSpecificListeners() {
    // Clear previous listeners
    mousePressed = () => {};
    mouseDragged = () => {};
    
    switch(currentRole.name) {
        case 'controller':
            setupControllerListeners();
            break;
        case 'speaker':
            setupSpeakerListeners();
            break;
        case 'commenter':
            setupCommenterListeners();
            break;
        case 'stickers':
            setupStickersListeners();
            break;
        case 'emoji':
            setupEmojiListeners();
            break;
    }
}

function draw() {
    background(220);
    
    // Draw base canvas elements
    drawController();
    drawSpeaker();
    drawComments();
    drawStickers();
    drawEmojis();
}

// Role-specific setup functions
function setupControllerListeners() {
    mouseDragged = () => {
        if (currentRole.name === 'controller') {
            interactions.controller.x = mouseX;
            interactions.controller.y = mouseY;
            socket.emit('interaction', {
                type: 'controller',
                x: mouseX,
                y: mouseY
            });
        }
    };
}

// Add other role-specific setup functions...

// Drawing functions
function drawController() {
    fill(0, 120, 255);
    ellipse(interactions.controller.x, interactions.controller.y, interactions.controller.size);
}

function drawSpeaker() {
    // Draw speaker visualization
}

function drawComments() {
    // Draw comments
}

function drawStickers() {
    // Draw stickers
}

function drawEmojis() {
    // Draw emojis
}

function handleInteraction(data) {
    switch(data.role) {
        case 'controller':
            interactions.controller.x = data.data.x;
            interactions.controller.y = data.data.y;
            break;
        // Handle other role interactions...
    }
}

function updateUsersList(users) {
    // Update UI to show current users and their roles
    const usersList = document.getElementById('users-list');
    if (!usersList) return;
    
    usersList.innerHTML = users.map(([socketId, userData]) => 
        `<div class="user-item">${userData.role.name}</div>`
    ).join('');
} 
