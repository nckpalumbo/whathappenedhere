const http = require('http');
const path = require('path');
const express = require('express');
const socketio = require('socket.io');
const xxh = require('xxhashjs');
const User = require('./User.js');
const Card = require('./Card.js');
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
const voteCards = {};
// Read in the card data
fs.readFile('./src/outcomes.txt', 'utf8', (err, data) => {
  if (err) throw err;
  outcomes = data.toString().split('\n');
});
fs.readFile('./src/explanations.txt', 'utf8', (err, data) => {
  if (err) throw err;
  explanations = data.toString().split('\n');
});

// Handle a connection to the server
io.on('connection', (sock) => {
  const socket = sock;
  socket.on('searchRoom', (data) => {
    const keys = Object.keys(players);
    for (let i = 0; i < keys.length; i++) {
      if (players[keys[i]].name === data.name) {
        socket.emit('nameTaken', { msg: 'Sorry, this username exists in this room already.' });
      }
    }
    // if player with username not in room and if game in room not started, let player join
    socket.emit('letJoin', { name: data.name, roomNum: data.room });
  });
  socket.on('join', (data) => {
    // message back to new user

    socket.name = data.name;
    socket.roomNum = data.room;
    socket.join(socket.roomNum);

    // Assign the user a unique ID
    const userID = xxh.h32(`${socket.id}${new Date().getTime()}`, 0xDEADDEAD).toString(16);

    // Create the new user using the unique ID and add to list
    players[userID] = new User(userID, data.name, data.roomNum);
    if (players.length === 1) {
      players[userID].host = true;
    }

    // Set the current socket's hash to the user's
    socket.userID = userID;

    // Send the information to the client
    socket.emit('joined', players[userID]);
    console.log(socket.name);
    console.log(socket.roomNum);
  });

  // Shuffle the cards
  const shuffle = (cards) => {
    // from https://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array
    const deck = cards;
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  };

  // Have the player draw a card
  socket.on('drawCard', () => {
    const player = players[socket.userID];

    // Czech if the player's hand is full
    if (player.hand.length > 5) {
      // If not, give them a card
      const explanation = new Card(explanations.pop(), 0, 0, 150, 250);
      // console.log(explanation);
      player.hand.unshift(explanation);
      // Update the client with the new information
      socket.emit('cardDrawn', player);
    }
  });

  // Host starts a new round
  socket.on('roundStart', () => {
    outcomes = shuffle(outcomes);
    explanations = shuffle(explanations);

    const keys = Object.keys(players);
    for (let i = 0; i < keys.length; i++) {
      const player = players[keys[i]];
      for (let j = 0; j < 5; j++) {
        player.hand[j] = new Card(explanations.pop(), 10 + (j * 200), 568, 150, 250);
      }
      // console.log(player.hand);
    }
    io.sockets.in(socket.roomNum).emit('updatePlayers', players);
    if (outcomes.length !== 0) {
      const outcome = new Card(outcomes.pop(), 450, 10, 200, 300);
      io.sockets.in(socket.roomNum).emit('newRound', outcome);
    }
  });

  // Timer update
  socket.on('timerUpdate', (data) => {
    // Czech if the player is the host
    if (players[socket.userID].host) {
      // If so count down
      const time = data - 1;
      io.sockets.in(socket.roomNum).emit('timerUpdated', time);
    }
  });

  // Handle when a user clicks the explanation for the current outcome
  socket.on('cardPicked', (data) => {
    voteCards[data.text] = data;
    io.sockets.in(socket.roomNum).emit('voteCardsUpdated', voteCards);
  });

  // Handle a user disconnecting
  socket.on('disconnect', () => {
    // Send the info of the user leaving to the clients
    io.sockets.in(socket.roomNum).emit('left', players[socket.userID]);

    // Remove the user from the list
    delete players[socket.userID];

    // Remove the socket that disconnected
    socket.leave(socket.roomNum);
  });
});
