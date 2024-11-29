const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const ROLES = require('./config/roles.js');
const connectedUsers = new Map(); // socketId -> role

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('\n🟢 New user connected:', socket.id);

    // Move existing users up one level
    for (const [existingSocketId, userData] of connectedUsers.entries()) {
        const oldRoom = userData.room;
        const newIndex = ROLES.indexOf(userData) + 1;
        const newRole = ROLES[newIndex];
        if (newRole) {
            console.log(`\n🔄 Moving user ${existingSocketId}:`);
            console.log(`   From: ${userData.name} (Room: ${oldRoom})`);
            console.log(`   To: ${newRole.name} (Room: ${newRole.room})`);
            
            io.in(existingSocketId).socketsLeave(oldRoom);
            io.in(existingSocketId).socketsJoin(newRole.room);
            connectedUsers.set(existingSocketId, newRole);
            io.to(existingSocketId).emit('assignRole', newRole);
        }
    }

    // Assign new user to index 0
    const firstRole = ROLES[0];
    connectedUsers.set(socket.id, firstRole);
    socket.join(firstRole.room);
    socket.emit('assignRole', firstRole);
    console.log(`\n📝 Assigned new user ${socket.id} to:`, firstRole.name);
    
    // Log current state
    console.log('\n📊 Current users:');
    for (const [socketId, role] of connectedUsers.entries()) {
        console.log(`   ${socketId}: ${role.name}`);
    }


    socket.on('disconnect', () => {
        console.log('\n🔴 User disconnected:', socket.id);
        connectedUsers.delete(socket.id);
        
        console.log('\n📊 Remaining users:');
        for (const [socketId, role] of connectedUsers.entries()) {
            console.log(`   ${socketId}: ${role.name}`);
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 