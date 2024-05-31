const express = require('express');
const https = require('https');
const { Server } = require('socket.io');
const axios = require('axios');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Carga los certificados SSL/TLS
const privateKey = fs.readFileSync('clave-privada.pem', 'utf8');
const certificate = fs.readFileSync('certificado.pem', 'utf8');
const ca = fs.readFileSync('autoridad-cert.pem', 'utf8');

const credentials = {
  key: privateKey,
  cert: certificate,
  ca: ca
};

// Crea el servidor HTTPS
const server = https.createServer(credentials, app);

// Inicializa Socket.IO en el servidor HTTPS
const io = new Server(server);

// Tu código Socket.IO sigue igual
const URL = 'http://127.0.0.1/backend/user.php?table=mensaje';
const users = {};

io.on('connection', (socket) => {
  console.log('a user connected');

  // Manejar el registro del usuario
  socket.on('registerUser', (userId) => {
    console.log(`User registered with ID: ${userId}`);
    users[socket.id] = userId;
    socket.userId = userId;
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

    // Llamar al endpoint para guardar el mensaje
    const data = {
      id_sala: roomName,
      user_emisor: userId,
      user_receptor: partnerId,
      message: message,
    };

    await axios.post(URL, data);
  });

  // Manejar la desconexión del usuario
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${users[socket.id]}`);
    delete users[socket.id];
  });
});

// Inicia el servidor HTTPS
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
