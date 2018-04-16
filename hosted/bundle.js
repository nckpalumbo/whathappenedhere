'use strict';

var canvas = void 0;
var ctx = void 0;
var socket = void 0;
var hash = void 0;
var isLeader = false;
var playedCard = false;
var hasVoted = false;
var outcome = void 0;
var score = 0;
var users = {};

// create user function -> if first user in room make them leader, others are normal players
// only leader can start game (must be 3 people in room at least)
var createUser = function createUser(data) {
    hash = data.userID;
    users[hash] = data;
    if (users.length === 1) isLeader = true;else isLeader = false;
    gameStart(data);
};

// Update the list of players
var updatePlayers = function updatePlayers(data) {
    users = data;
};

// game function -> prompts leader to start game if there are at least 3 players in room
var gameStart = function gameStart(data) {
    if (users.length >= 3) {
        // show start button; if leader clicks it, hide button and begin game
        //socket.emit('roundStart');
    }
    socket.emit('roundStart');
};

// game update -> prompts players to make card selection; prompts server when a card is picked or time runs out
var gameUpdate = function gameUpdate(data) {
    // starts timer at 60 seconds and counts down
    // tells client to click on a card (eventually when hovered over, make it increase in y value to show it is hovered)
    // on click event where when user plays card, it leaves their hand and joins the pile near the outcome card
    // socket.emit('drawCard', ()); after user plays card
};

// Draw the game
var draw = function draw() {
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "lightblue";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw the outcome card
    ctx.font = '28px sans-serif';
    ctx.fillStyle = "lightgrey";
    ctx.fillRect(canvas.width / 2 - 200, canvas.height / 3 - 50, 200, 300);
    ctx.fillStyle = 'black';
    ctx.fillText(outcome, canvas.width / 2 - 200, canvas.height / 3, 200);
    ctx.fillText("Because", canvas.width / 2 + 50, canvas.height / 2, 200);

    // Draw the player's hand
    ctx.font = '20px sans-serif';
    for (var i = 0; i < users[hash].hand.length; i++) {
        ctx.fillStyle = "lightgrey";
        ctx.fillRect(10 + i * 200, canvas.height - canvas.height / 5, 150, 250);
        ctx.fillStyle = 'black';
        ctx.fillText(users[hash].hand[i].toString(), 10 + i * 200, canvas.height - canvas.height / 6, 150);
    }
};

// Start a new round
var startRound = function startRound(data) {
    outcome = data;
    draw();
};

// voting function -> reveals all cards and prompts players to vote; prompts server when vote is made or time runs out

// results function -> reveals how many votes each card got, and gives corresponding player correct amount of points

// end game function -> ends game if player has reached max points, or less than 3 people left in room

// in app purchases function -> let's players "buy" packs for $$ or in-game currency (points); probably just make all free for game

// delete user function -> if they leave room, erase their data
var removeUser = function removeUser(data) {
    if (users[data]) {
        delete users[data];
    }
};

// random num const
var randomNum = function randomNum(r) {
    return Math.floor(Math.random() * r);
};

var init = function init() {
    canvas = document.querySelector('#canvas');
    ctx = canvas.getContext('2d');
    socket = io.connect();
    socket.on('joined', createUser);
    socket.on('newRound', startRound);
    socket.on('updatePlayers', updatePlayers);
    //socket.on('cardDrawn', cardDraw);
    //socket.on('timerUpdated', updateTime);
    socket.on('left', removeUser);
    //event listeners for onmousedown(start button), onmousedown(card), onmouseover(card)
    console.log("hello");
};

window.onload = init;
