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
var timer = 0;
var users = {};
var voteCards = {};
var outcomeBack = void 0;
var explainBack = void 0;
var emptyHorizontal = void 0;
var emptyVertical = void 0;
var length = void 0;
var numRounds = void 0;

// create user function -> if first user in room make them leader, others are normal players
// only leader can start game (must be 3 people in room at least)
var createUser = function createUser(data) {
    hash = data.id;
    users[hash] = data.user;
    if (data.length === 1) isLeader = true;else isLeader = false;
    gameStart(data);
    console.log(isLeader);
};

var cardStyle = {
    outcomeWidth: 300,
    outcomeHeight: 200,
    explainWidth: 150,
    explainHeight: 250,
    outcomeFont: '28px Papyrus',
    explainFont: '24px Papyrus',
    cardColor: 'lightgrey',
    textColor: 'black'
};

var displayWrappedText = function displayWrappedText(context, text, x, y, maxWidth, lineHeight) {
    var words = text.split(' ');
    var line = '';

    for (var i = 0; i < words.length; i++) {
        var testLine = line + words[i] + ' ';
        var measures = context.measureText(testLine);
        var testWidth = measures.width;
        if (testWidth > maxWidth && i > 0) {
            context.fillText(line, x, y);
            line = words[i] + ' ';
            y += lineHeight;
        } else {
            line = testLine;
        }
    }
    context.fillText(line, x, y);
};

// Update the list of players
var updatePlayers = function updatePlayers(data) {
    users = data.room;
    length = data.length;
    console.log(length);
};

// Update the timer
var updateTime = function updateTime(data) {
    timer = data;
};

// game function -> prompts leader to start game if there are at least 3 players in room
var gameStart = function gameStart(data) {
    var start = document.querySelector('#start');
    var roundSlider = document.querySelector('#roundSlider');
    var timeSlider = document.querySelector('#timeSlider');
    if (isLeader) {
        start.disabled = false;
        roundSlider.disabled = false;
        timeSlider.disabled = false;
    } else {
        start.disabled = true;
        roundSlider.disabled = true;
        timeSlider.disabled = true;
    }
    start.addEventListener('click', function () {
        if (length >= 3 && isLeader) {
            timer = timeSlider.value;
            numRounds = roundSlider.value;
            console.log(timer + " " + numRounds);
            socket.emit('roundStart');
        }
    });
};

// game update -> prompts players to make card selection; prompts server when a card is picked or time runs out
var gameUpdate = function gameUpdate() {
    // starts timer at 60 seconds and counts down
    socket.emit('timerUpdate', timer);
    ctx.fillStyle = "lightblue";
    ctx.fillRect(944, 0, 80, 80);
    ctx.font = "32px Helvetica";
    ctx.fillStyle = cardStyle.textColor;
    if (timer > 0) ctx.fillText(timer, 950, 30);else ctx.fillText('0', 950, 30);
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

    var outcomeMaxWidth = 230;
    var explainMaxWidth = 135;
    var lineHeight = 30;

    // Draw the outcome card
    ctx.font = cardStyle.outcomeFont;
    ctx.fillStyle = cardStyle.cardColor;
    ctx.fillStyle = cardStyle.textColor;
    ctx.drawImage(outcomeBack, outcome.x - 225, outcome.y);
    ctx.drawImage(emptyHorizontal, outcome.x + 100, outcome.y);
    displayWrappedText(ctx, outcome.text, outcome.x + 110, outcome.y + 45, outcomeMaxWidth, lineHeight);
    ctx.font = "32px Helvetica";
    ctx.fillText("Because... ", canvas.width / 2 - 60, canvas.height / 3 - 50, 200);

    // Draw the player's hand
    ctx.font = cardStyle.explainFont;
    for (var i = 0; i < users[hash].hand.length; i++) {
        var card = users[hash].hand[i];
        ctx.drawImage(emptyVertical, card.x + 30, card.y - 60);
        ctx.font = cardStyle.explainFont;
        ctx.fillStyle = cardStyle.cardColor;
        ctx.fillStyle = cardStyle.textColor;
        displayWrappedText(ctx, card.text, card.x + 40, card.y - 15, explainMaxWidth, lineHeight + 5);
    }

    // Draw the cards that are being voted on
    ctx.font = cardStyle.explainFont;
    var voteKeys = Object.keys(voteCards);
    for (var _i = 0; _i < voteKeys.length; _i++) {
        ctx.drawImage(emptyVertical, 40 + _i * 200, 250);
        ctx.fillStyle = cardStyle.cardColor;
        ctx.fillStyle = cardStyle.textColor;
        displayWrappedText(ctx, voteCards[voteKeys[_i]].text, 50 + _i * 200, 295, explainMaxWidth, lineHeight + 5);
    }
};

// Update the explanations that have been submitted
var updateVoteCards = function updateVoteCards(data) {
    voteCards = data;
    draw();
};

// Get the mouse
var getMouse = function getMouse(e) {
    var mouse = {};
    mouse.x = e.pageX - e.target.offsetLeft;
    mouse.y = e.pageY - e.target.offsetTop;
    return mouse;
};

// Handle when the player clicks the mouse
var mouseDownHandle = function mouseDownHandle(e) {
    var hand = users[hash].hand;
    var mouse = getMouse(e);
    if (!playedCard) {
        for (var i = 0; i < hand.length; i++) {
            if (mouse.x < hand[i].x + 30 + hand[i].width && mouse.x > hand[i].x + 30 && mouse.y < hand[i].y - 60 + hand[i].height && mouse.y > hand[i].y - 60) {
                hand[i].clicked = true;
                break;
            }
        }
    }

    var voteKeys = Object.keys(voteCards);
    for (var _i2 = 0; _i2 < voteKeys.length; _i2++) {
        if (mouse.x < voteCards[voteKeys[_i2]].x + voteCards[voteKeys[_i2]].width && mouse.x > voteCards[voteKeys[_i2]].x && mouse.y < voteCards[voteKeys[_i2]].y + voteCards[voteKeys[_i2]].height && mouse.y > voteCards[voteKeys[_i2]].y) {
            voteCards[voteKeys[_i2]].votes++;
            break;
        }
    }
};

// Handle when the player releases the mouse
var mouseUpHandle = function mouseUpHandle(e) {
    var hand = users[hash].hand;
    var mouse = getMouse(e);
    for (var i = 0; i < hand.length; i++) {
        if (hand[i].clicked) {
            playedCard = true;
            socket.emit("cardPicked", hand[i]);
            //hand.splice(i);
            break;
        }
    }
};

// Start a new round
var startRound = function startRound(data) {
    document.querySelector('#start').style.display = "none";
    document.querySelector('#roundSlider').style.display = "none";
    document.querySelector('#timeSlider').style.display = "none";
    document.querySelector('#roundLabel').style.display = "none";
    document.querySelector('#timeLabel').style.display = "none";
    document.querySelector('#roundAmount').style.display = "none";
    document.querySelector('#timeAmount').style.display = "none";
    outcome = data;
    setInterval(gameUpdate, 1000);
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
    var connect = document.querySelector("#connect");
    connect.addEventListener('click', connectSocket);
    //event listeners for onmousedown(start button), onmousedown(card),
    canvas.onmousedown = mouseDownHandle;
    canvas.onmouseup = mouseUpHandle;

    outcomeBack = document.querySelector("#outcBack");
    explainBack = document.querySelector("#explBack");
    emptyHorizontal = document.querySelector("#emptyHor");
    emptyVertical = document.querySelector("#emptyVer");
};

var connectSocket = function connectSocket() {
    socket = io.connect();
    var user = document.querySelector("#username").value;
    var roomNum = document.querySelector("#roomNum").value;
    console.log(user + " " + roomNum);
    socket.on('connect', function () {
        if (!user) {
            user = 'unknown';
        }
        socket.emit('searchRoom', { name: user, room: roomNum });
    });

    socket.on('letJoin', function (data) {
        socket.emit('join', { name: data.name, room: data.roomNum });
        document.querySelector('#connect').style.display = "none";
        document.querySelector('#startRoom').style.display = "none";
        document.querySelector('#canvas').style.display = "block";
        document.querySelector('#start').style.display = "block";
        document.querySelector('#roundSlider').style.display = "block";
        document.querySelector('#timeSlider').style.display = "block";
        document.querySelector('#roundLabel').style.display = "block";
        document.querySelector('#timeLabel').style.display = "block";
        document.querySelector('#roundAmount').style.display = "block";
        document.querySelector('#timeAmount').style.display = "block";
        //document.querySelector('#webChat').style.display = "block";
    });

    socket.on('nameTaken', function (data) {
        window.alert(data.msg);
        user.value = "";
        roomNum.value = "";
        socket.disconnect();
    });
    socket.on('joined', createUser);
    socket.on('newRound', startRound);
    socket.on('updatePlayers', updatePlayers);
    socket.on('voteCardsUpdated', updateVoteCards);
    //socket.on('cardDrawn', cardDraw);
    socket.on('timerUpdated', updateTime);
    socket.on('left', removeUser);
};

window.onload = init;
