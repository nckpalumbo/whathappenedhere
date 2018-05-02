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

// create list of rooms
const rooms = {};
// Create a list of outcomes and explanations
let outcomes = [];
let explanations = [];
const voteCards = {};

// Handle a connection to the server
io.on('connection', (sock) => {
  const socket = sock;
  socket.on('searchRoom', (data) => {
    const roomKey = Object.keys(rooms);
    let roomExists = false;
    for (let i = 0; i < roomKey.length; i++) {
      if (roomKey[i] === data.room) {
        roomExists = true;
      }
    }
    if (roomExists) {
      let nameExists = false;
      const keys = Object.keys(rooms[data.room]);
      for (let i = 0; i < keys.length; i++) {
        if (rooms[data.room][keys[i]].name === data.name) {
          nameExists = true;
        }
      }
      if (Object.keys(rooms[data.room]).length > 4) {
        socket.emit('maxLimit', { msg: 'Sorry, the maximum amount of players are in this room already.' });
      } else if (nameExists) {
        socket.emit('nameTaken', { msg: 'Sorry, this username exists in this room already.' });
      } else {
        // if player with username not in room and if game in room not started, let player join
        socket.emit('letJoin', { name: data.name, roomNum: data.room });
      }
    }

    if (!roomExists) {
      const newPlayers = {};
      rooms[data.room] = newPlayers;
      // if player with username not in room and if game in room not started, let player join
      socket.emit('letJoin', { name: data.name, roomNum: data.room });
    }
  });
  socket.on('join', (data) => {
    // message back to new user

    socket.name = data.name;
    socket.roomNum = data.room;
    socket.join(socket.roomNum);

    // Assign the user a unique ID
    const userID = xxh.h32(`${socket.id}${new Date().getTime()}`, 0xDEADDEAD).toString(16);

    // Create the new user using the unique ID and add to list
    rooms[data.room][userID] = new User(userID, data.name, data.room);

    const keys = Object.keys(rooms[socket.roomNum]);
    if (keys.length === 1) {
      rooms[data.room][userID].host = true;
    }

    // Set the current socket's hash to the user's
    socket.userID = userID;

    // Send the information to the client
    const playersLength = Object.keys(rooms[data.room]);
    socket.emit('joined', { user: rooms[data.room][userID], id: userID, length: playersLength.length });
    io.sockets.in(socket.roomNum).emit('updatePlayers', { room: rooms[socket.roomNum], length: playersLength.length });
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
    const player = rooms[socket.roomNum][socket.userID];

    // Czech if the player's hand is full
    if (player.hand.length > 5) {
      // If not, give them a card
      const explanation = new Card(explanations.pop(), 0, 0, 150, 250);
      player.hand.unshift(explanation);
      // Update the client with the new information
      socket.emit('cardDrawn', player);
    }
  });

  socket.on('scoreUpdated', (data) => {
    rooms[socket.roomNum][data.userID].score = data.score;
    const playersLength = Object.keys(rooms[socket.roomNum]);
    io.sockets.in(socket.roomNum).emit('updatePlayers', { room: rooms[socket.roomNum], length: playersLength.length });
  });

  // Handles messages
  socket.on('msgToServer', (data) => {
    io.sockets.in(socket.roomNum).emit('msgToClient', { user: data.user, msg: data.msg });
  });
  // Host changes amount of rounds
  socket.on('roundNumChange', (data) => {
    const newRoundNum = data;
    io.sockets.in(socket.roomNum).emit('updateRound', newRoundNum);
  });
  // Host changes amount of seconds per round
  socket.on('timeNumChange', (data) => {
    const newTimeNum = data;
    io.sockets.in(socket.roomNum).emit('updateTimer', newTimeNum);
  });
  // Host starts a new round
  socket.on('roundStart', () => {
  // Read in the card data
    fs.readFile('./src/outcomes.txt', 'utf8', (err, data) => {
      if (err) throw err;
      outcomes = data.toString().split('\n');
    });
    fs.readFile('./src/explanations.txt', 'utf8', (err, data) => {
      if (err) throw err;
      explanations = data.toString().split('\n');
    });
    outcomes = shuffle(outcomes);
    explanations = shuffle(explanations);

    const keys = Object.keys(rooms[socket.roomNum]);
    for (let i = 0; i < keys.length; i++) {
      const player = rooms[socket.roomNum][keys[i]];
      for (let j = 0; j < 5; j++) {
        player.hand[j] = new Card(explanations.pop(), 10 + (j * 200), 568, 150, 250);
      }
    }
    const playersLength = Object.keys(rooms[socket.roomNum]);
    io.sockets.in(socket.roomNum).emit('updatePlayers', { room: rooms[socket.roomNum], length: playersLength.length });
    if (outcomes.length !== 0) {
      const outcome = new Card(outcomes.pop(), 450, 10, 200, 300);
      io.sockets.in(socket.roomNum).emit('newRound', outcome);
    }
  });

  // Timer update
  socket.on('timerUpdate', (data) => {
    // Czech if the player is the host
    if (rooms[socket.roomNum][socket.userID].host) {
      // If so count down
      const time = data - 1;
      io.sockets.in(socket.roomNum).emit('timerUpdated', time);
    }
  });

  // Update the list of cards to be voted for serverside
  socket.on('votesUpdated', (data) => {
    voteCards[socket.roomNum] = data;
    io.sockets.in(socket.roomNum).emit('voteCardsUpdated', voteCards[socket.roomNum]);
  });

  // Handle the character voting for a card
  socket.on('vote', (data) => {
    voteCards[socket.roomNum][data].votes++;
    io.sockets.in(socket.roomNum).emit('voteCardsUpdated', voteCards[socket.roomNum]);
  });

  // Handle when a user clicks the explanation for the current outcome
  socket.on('cardPicked', (data) => {
    const keys = Object.keys(voteCards);
    let ifExists = false;
    for (let i = 0; i < keys.length; i++) {
      if (keys[i] === socket.roomNum) {
        ifExists = true;
      }
    }
    if (ifExists) {
      voteCards[socket.roomNum][socket.userID] = data;
    } else {
      const group = {};
      voteCards[socket.roomNum] = group;
      voteCards[socket.roomNum][socket.userID] = data;
    }
    io.sockets.in(socket.roomNum).emit('voteCardsUpdated', voteCards[socket.roomNum]);
  });

  socket.on('gameOver', () => {
    io.sockets.in(socket.roomNum).emit('endGame');
  });

  // Handle a user disconnecting
  socket.on('disconnect', () => {
    // Send the info of the user leaving to the clients
    console.log(Object.keys(rooms[socket.roomNum]));
    const keys = Object.keys(rooms[socket.roomNum]);
    if (keys.length > 1) {
      for (let i = 0; i < keys.length; i++) {
        const quitter = rooms[socket.roomNum][socket.userID];
        const player = rooms[socket.roomNum][keys[i]];
        if (quitter === player && quitter.host === true) {
          for (let j = i + 1; j < keys.length; j++) {
            if (rooms[socket.roomNum][keys[j]]) {
              const newHost = rooms[socket.roomNum][keys[j]];
              newHost.host = true;
              quitter.host = false;
              io.sockets.in(socket.roomNum).emit('updateLeader', newHost);
              break;
            }
          }
        }
      }
    }
    io.sockets.in(socket.roomNum).emit('left', rooms[socket.roomNum][socket.userID]);
    // Remove the user from the list
    delete rooms[socket.roomNum][socket.userID];

    // Remove the socket that disconnected
    socket.leave(socket.roomNum);
    const playersLength = Object.keys(rooms[socket.roomNum]);
    io.sockets.in(socket.roomNum).emit('updatePlayers', { room: rooms[socket.roomNum], length: playersLength.length });
  });
});
