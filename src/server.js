const http = require('http');
const path = require('path');
const express = require('express');
const socketio = require('socket.io');
const xxh = require('xxhashjs');
const User = require('./User.js');
const fs = require('fs');

const PORT = process.env.PORT || process.env.NODE_PORT || 3000;

// Using express library
const app = express();
app.use('/assets', express.static(path.resolve(`${__dirname}/../hosted/`)));

app.get('/', (req, res) => {
  res.sendFile(path.resolve(`${__dirname}/../hosted/index.html`));
});

const server = http.createServer(app);

const io = socketio(server);

server.listen(PORT, (err) => {
  if (err) {
    throw err;
  }

  console.log(`Listening on 127.0.0.1: ${PORT}`);
});

// Create a list of the people playing
const players = {};
// Create a list of outcomes and explanations
let outcomes = [];
let explanations = [];
// Read in the card data
fs.readFile('./src/outcomes.txt', 'utf8', (err, data) => {
  if (err) throw err;
  outcomes = data.toString().split('\n');
  for (let i = 0; i < outcomes.length; i++) {
    console.log(outcomes[i]);
  }
});
fs.readFile('./src/explanations.txt', 'utf8', (err, data) => {
  if (err) throw err;
  explanations = data.toString().split('\n');
  for (let i = 0; i < explanations.length; i++) {
    console.log(explanations[i]);
  }
});

// Handle a connection to the server
io.on('connection', (sock) => {
  const socket = sock;

  // New user joins the room
  socket.join('shitfuck');

  // Assign the user a unique ID
  const userID = xxh.h32(`${socket.id}${new Date().getTime()}`, 0xDEADDEAD).toString(16);

  // Create the new user using the unique ID and add to list
  players[userID] = new User(userID);

  // Set the current socket's hash to the user's
  socket.userID = userID;

  // Send the information to the client
  socket.emit('joined', players[userID]);

  // Have the player draw a card
  socket.on('drawCard', () => {
    const player = players[socket.userID];

    // Czech if the player's hand is full
    if (player.hand.length > 5) {
      // If not, give them a card
      const explanation = explanations.pop();
      player.hand.push(explanation);
      // Update the client with the new information
      socket.emit('cardDrawn', player);
    }
  });

  // Host starts a new round
  socket.on('roundStart', () => {
    if (outcomes.length !== 0) {
      const outcome = outcomes.pop();
      io.sockets.in('shitfuck').emit('newRound', outcome);
    }
  });
    
    // Shuffle the cards
    socket.on('shuffle', () => {
        
    });

  // Timer update
  socket.on('timerUpdate', (data) => {
    // Czech if the player is the host
    if (players[socket.userID].host) {
      // If so count down
      const time = data - 1;
      io.sockets.in('shitfuck').emit('timerUpdated', time);
    }
  });

  // Handle a user disconnecting
  socket.on('disconnect', () => {
    // Send the info of the user leaving to the clients
    io.sockets.in('shitfuck').emit('left', players[socket.userID]);

    // Remove the user from the list
    delete players[socket.userID];

    // Remove the socket that disconnected
    socket.leave('shitfuck');
  });
});
