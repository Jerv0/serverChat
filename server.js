const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const URL = 'https://127.0.0.1/backend/user.php?table=mensaje';
const users = {}; // Almacenará los usuarios conectados

io.on('connection', (socket) => {
    console.log('a user connected');

    // Manejar el registro del usuario
    socket.on('registerUser', (userId) => {
        console.log(`User registered with ID: ${userId}`);
        users[socket.id] = userId;
        socket.userId = userId; // Asigna el ID al socket para facilitar el manejo
    });

    // Manejar la unión a una sala privada
    socket.on('joinPrivateRoom', (userId, partnerId) => {
        const roomName = [userId, partnerId].sort().join('_');
        socket.join(roomName);
        console.log(`User ${userId} joined private room: ${roomName}`);

        // Notificar al compañero que el usuario se ha unido a la sala
        socket.to(roomName).emit('partnerJoinedPrivateRoom', userId);
    });

    // Manejar el envío de mensajes a la sala privada
    socket.on('sendMessageToPrivateRoom', async (userId, partnerId, message) => {
        const roomName = [userId, partnerId].sort().join('_');
        const msg = { user: userId, message };
        io.to(roomName).emit('messageFromPrivateRoom', msg);
        console.log(`Message from ${userId} to ${roomName}: ${message}`);

        // Configurar axios para ignorar certificados no válidos
        const axiosInstance = axios.create({
            httpsAgent: new https.Agent({ rejectUnauthorized: false })
        });

        // Llamar al endpoint para guardar el mensaje
        const data = {
            id_sala: roomName,
            user_emisor: userId,
            user_receptor: partnerId,
            message: message,
        };

        console.log(data);
        await axiosInstance.post(URL, data);

        const response = await axiosInstance.get(URL);

        console.log(response.data);
    });

    // Manejar la desconexión del usuario
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${users[socket.id]}`);
        delete users[socket.id];
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
