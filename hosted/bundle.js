'use strict';

var canvas = void 0;
var ctx = void 0;
var socket = void 0;
var hash = void 0;
var outcome = void 0;
var outcomeBack = void 0;
var explainBack = void 0;
var emptyHorizontal = void 0;
var emptyVertical = void 0;
var users = {};
var voteCards = {};
var score = 0;
var timer = 0;
var origTimer = 0;
var numRounds = 0;
var currRound = 0;
var state = 0;
var length = 0;
var isLeader = false;
var playedCard = false;
var hasVoted = false;

// Create an object to hold the gamestates
var GAMESTATE = {
    START: 0,
    SELECT: 1,
    VOTE: 2,
    ENDROUND: 3,
    END: 4
};

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
    var keys = Object.keys(users);
    var scoreDisplay = "";
    document.getElementById("scoreHolder").innerHTML = "";
    for (var i = 0; i < keys.length; i++) {
        var user = users[keys[i]];
        var userScoreElement = document.createElement("h4");
        var userScore = document.createTextNode(user.name + ": " + user.score);
        userScoreElement.appendChild(userScore);
        document.getElementById("scoreHolder").appendChild(userScoreElement);
    }
    console.log("Players in room: " + length);
    if (length < 3 && state > GAMESTATE.START && state < GAMESTATE.END) {
        socket.emit('gameOver');
    }
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
            origTimer = timeSlider.value;
            timer = timeSlider.value;
            numRounds = roundSlider.value;
            state = 0;
            currRound = 0;
            socket.emit('roundStart');
        } else {
            socket.emit('msgToServer', { user: 'Server', msg: 'You must have at least 3 players ready to start.' });
        }
    });
    roundSlider.addEventListener('change', function () {
        socket.emit('roundNumChange', roundSlider.value);
    });
    timeSlider.addEventListener('change', function () {
        socket.emit('timeNumChange', timeSlider.value);
    });
};

var updateRounds = function updateRounds(data) {
    var roundSlider = document.querySelector('#roundSlider');
    var roundAmount = document.querySelector('#roundAmount');
    roundSlider.value = data;
    roundAmount.innerHTML = data;
};

var updateTimers = function updateTimers(data) {
    var timeSlider = document.querySelector('#timeSlider');
    var timeAmount = document.querySelector('#timeAmount');
    timeSlider.value = data;
    timeAmount.innerHTML = data;
};
// game update -> prompts players to make card selection; prompts server when a card is picked or time runs out
var gameUpdate = function gameUpdate() {
    // starts timer at player selected value in seconds and counts down
    ctx.fillStyle = "lightblue";
    ctx.fillRect(944, 0, 80, 80);
    ctx.font = "32px Palatino, Palatino Linotype, Palatino LT STD";
    ctx.fillStyle = cardStyle.textColor;
    if (timer > 0 && (state === GAMESTATE.SELECT || state === GAMESTATE.VOTE)) {
        socket.emit('timerUpdate', timer);
        ctx.fillText(timer, 975, 50);
    } else if (timer <= 0) {
        timer = 0;
        ctx.fillText(timer, 975, 50);
        if (state === GAMESTATE.SELECT) {
            state = GAMESTATE.VOTE;
            timer = origTimer;
        } else if (state === GAMESTATE.VOTE && hasVoted) {
            state = GAMESTATE.ENDROUND;
        }
        draw();
    }
    // tells client to click on a card (eventually when hovered over, make it increase in y value to show it is hovered)
    // on click event where when user plays card, it leaves their hand and joins the pile near the outcome card
    // socket.emit('drawCard', ()); after user plays card

    // Counts up the votes when all the voting state is over
    if (state === GAMESTATE.ENDROUND) {
        console.log('round over');
        hasVoted = false;
        playedCard = false;
        var keys = Object.keys(voteCards);
        for (var i = 0; i < keys.length; i++) {
            users[keys[i]].score += voteCards[keys[i]].votes;
            var data = { userID: keys[i], score: users[keys[i]].score };
            socket.emit('scoreUpdated', data);
            if (currRound === numRounds) {
                socket.emit('gameOver');
            }
        }
        voteCards = {};
        socket.emit('votesUpdated', voteCards);
        if (currRound < numRounds) {
            currRound++;
            state = GAMESTATE.SELECT;
            timer = origTimer;
        } else {
            state = GAMESTATE.END;
        }
    }
    //console.log("state: " + state);
};

// Draw the game
var draw = function draw() {
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "lightblue";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (state < 4) {
        var outcomeMaxWidth = 230;
        var explainMaxWidth = 135;
        var lineHeight = 30;

        // Draw the timer
        ctx.font = "32px Palatino, Palatino Linotype, Palatino LT STD";
        ctx.fillStyle = cardStyle.textColor;
        if (timer > 0) ctx.fillText(timer, 975, 50);else ctx.fillText('0', 975, 50);

        // Draw the round counter
        ctx.font = "32px Palatino, Palatino Linotype, Palatino LT STD";
        ctx.fillStyle = cardStyle.textColor;
        ctx.fillText("Round: " + currRound + "/" + numRounds, 25, 50);

        // Draw the outcome card
        ctx.font = cardStyle.outcomeFont;
        ctx.fillStyle = cardStyle.cardColor;
        ctx.fillStyle = cardStyle.textColor;
        ctx.drawImage(outcomeBack, outcome.x - 225, outcome.y);
        ctx.drawImage(emptyHorizontal, outcome.x + 100, outcome.y);
        displayWrappedText(ctx, outcome.text, outcome.x + 110, outcome.y + 45, outcomeMaxWidth, lineHeight);
        //Because
        ctx.font = "32px Palatino, Palatino Linotype, Palatino LT STD";
        ctx.fillText("Because... ", canvas.width / 2 - 60, canvas.height / 3 - 50, 200);

        var voteKeys = Object.keys(voteCards);
        if (voteKeys.length === length) {
            if (state === GAMESTATE.SELECT) {
                timer = origTimer;
                state = 2;
            }
            if (state === GAMESTATE.VOTE) {
                //Prompt vote
                ctx.font = "32px Palatino, Palatino Linotype, Palatino LT STD";
                ctx.fillText("Click on a card to vote for your favorite... ", canvas.width / 2 - 175, canvas.height - 150, 400);
            }
        }

        // Draw the player's hand
        ctx.font = cardStyle.explainFont;
        for (var i = 0; i < users[hash].hand.length; i++) {
            var card = users[hash].hand[i];
            if (state === GAMESTATE.VOTE) {
                ctx.globalAlpha = 0;
            } else if (state === GAMESTATE.SELECT) {
                ctx.font = "32px Palatino, Palatino Linotype, Palatino LT STD";
                ctx.fillText("Waiting for everyone to select a card... ", canvas.width / 2 - 175, canvas.height / 2, 400);
            } else {
                ctx.globalAlpha = 1;
            }
            ctx.drawImage(emptyVertical, card.x + 30, card.y - 60);
            ctx.font = cardStyle.explainFont;
            ctx.fillStyle = cardStyle.cardColor;
            ctx.fillStyle = cardStyle.textColor;
            displayWrappedText(ctx, card.text, card.x + 40, card.y - 15, explainMaxWidth, lineHeight + 5);
            ctx.globalAlpha = 1;
        }

        // Draw the cards that are being voted on
        ctx.font = cardStyle.explainFont;
        for (var _i = 0; _i < voteKeys.length; _i++) {
            voteCards[voteKeys[_i]].x = 40 + _i * 200;
            if (voteKeys.length < length && timer > 0 && state === GAMESTATE.SELECT) {
                ctx.drawImage(explainBack, 40 + _i * 200, 250);
                ctx.fillStyle = cardStyle.cardColor;
                ctx.fillStyle = cardStyle.textColor;
            } else if (voteKeys.length < length && timer <= 0) {
                ctx.drawImage(emptyVertical, 40 + _i * 200, 250);
                ctx.fillStyle = cardStyle.cardColor;
                ctx.fillStyle = cardStyle.textColor;
                displayWrappedText(ctx, voteCards[voteKeys[_i]].text, 50 + _i * 200, 295, explainMaxWidth, lineHeight + 5);
            } else if (voteKeys.length == length || state === GAMESTATE.VOTE) {
                ctx.drawImage(emptyVertical, 40 + _i * 200, 250);
                ctx.fillStyle = cardStyle.cardColor;
                ctx.fillStyle = cardStyle.textColor;
                displayWrappedText(ctx, voteCards[voteKeys[_i]].text, 50 + _i * 200, 295, explainMaxWidth, lineHeight + 5);
            }
        }
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
    if (!playedCard && state === GAMESTATE.SELECT) {
        for (var i = 0; i < hand.length; i++) {
            if (mouse.x < hand[i].x + 30 + hand[i].width && mouse.x > hand[i].x + 30 && mouse.y < hand[i].y - 60 + hand[i].height && mouse.y > hand[i].y - 60) {
                hand[i].clicked = true;
                break;
            }
        }
    }

    if (state === GAMESTATE.VOTE && !hasVoted) {
        var voteKeys = Object.keys(voteCards);
        for (var _i2 = 0; _i2 < voteKeys.length; _i2++) {
            if (mouse.x < voteCards[voteKeys[_i2]].x + cardStyle.explainWidth && mouse.x > voteCards[voteKeys[_i2]].x && mouse.y < 250 + cardStyle.explainHeight && mouse.y > 250) {
                if (voteKeys[_i2] !== hash) {
                    hasVoted = true;
                    socket.emit('vote', voteKeys[_i2]);
                    break;
                }
            }
        }
    }
};

// Handle when the player releases the mouse
var mouseUpHandle = function mouseUpHandle(e) {
    var hand = users[hash].hand;
    var mouse = getMouse(e);
    for (var i = 0; i < hand.length; i++) {
        if (hand[i].clicked && state === GAMESTATE.SELECT) {
            playedCard = true;
            socket.emit("cardPicked", hand[i]);
            //users[hash].hand.splice(i);
            //socket.emit('drawCard', users[hash]);
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
    state = 1;
    currRound++;
    console.log(currRound + " " + numRounds);
    draw();
};

//Send messages
var sendMessage = function sendMessage(e) {
    var messageSend = document.querySelector('#message').value;
    var user = document.querySelector("#username").value;
    if (messageSend) {
        socket.emit('msgToServer', { user: user, msg: messageSend });
    }
    document.querySelector('#message').value = '';
};

// voting function -> reveals all cards and prompts players to vote; prompts server when vote is made or time runs out

// results function -> reveals how many votes each card got, and gives corresponding player correct amount of points

// end game function -> ends game if player has reached max points, or less than 3 people left in room
var endGame = function endGame() {
    console.log("Game over!");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "lightblue";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    state = 4;
    playedCard = false;
    score = 0;
    hasVoted = false;
    voteCards.length = 0;
    document.querySelector('#start').style.display = "block";
    document.querySelector('#roundSlider').style.display = "block";
    document.querySelector('#timeSlider').style.display = "block";
    document.querySelector('#roundLabel').style.display = "block";
    document.querySelector('#timeLabel').style.display = "block";
    document.querySelector('#roundAmount').style.display = "block";
    document.querySelector('#timeAmount').style.display = "block";
};

// delete user function -> if they leave room, erase their data
var removeUser = function removeUser(data) {
    if (users[data]) {
        delete users[data];
    }
};

var updateLeader = function updateLeader(data) {
    if (users[hash].name === data.name) {
        isLeader = true;
        start.disabled = false;
        roundSlider.disabled = false;
        timeSlider.disabled = false;
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
    var dlc = document.querySelector("#dlc");
    dlc.addEventListener('click', showDLC);
    var returnToMenu = document.querySelector('#returnToMenu');
    returnToMenu.addEventListener('click', displayMenu);
    var chat = document.querySelector('#chat');
    chat.innerHTML = "";
    //event listeners for onmousedown(start button), onmousedown(card),
    canvas.onmousedown = mouseDownHandle;
    canvas.onmouseup = mouseUpHandle;

    outcomeBack = document.querySelector("#outcBack");
    explainBack = document.querySelector("#explBack");
    emptyHorizontal = document.querySelector("#emptyHor");
    emptyVertical = document.querySelector("#emptyVer");
};

var showDLC = function showDLC() {
    document.querySelector('#dlcCanvas').style.display = "block";
    document.querySelector('#connect').style.display = "none";
    document.querySelector('#startRoom').style.display = "none";
    document.querySelector('#dlc').style.display = "none";
};
var displayMenu = function displayMenu() {
    document.querySelector('#dlcCanvas').style.display = "none";
    document.querySelector('#connect').style.display = "inline-block";
    document.querySelector('#startRoom').style.display = "block";
    document.querySelector('#dlc').style.display = "inline-block";
};

var connectSocket = function connectSocket() {
    socket = io.connect();
    var user = document.querySelector("#username").value;
    var roomNum = document.querySelector("#roomNum").value;
    socket.on('connect', function () {
        if (!user) {
            user = 'unknown';
        }
        if (roomNum != "") {
            socket.emit('searchRoom', { name: user, room: roomNum });
        } else {
            window.alert("You must enter a room code");
        }
    });

    message.addEventListener('keyup', function (e) {
        e.preventDefault();
        if (e.keyCode === 13) {
            sendMessage();
            message.value = '';
        }
    });

    socket.on('msgToClient', function (data) {
        chat.innerHTML += data.user + ": " + data.msg + '\n';
    });

    document.querySelector('#send').onclick = sendMessage;

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
        document.querySelector('#message').style.display = "inline-block";
        document.querySelector('#send').style.display = "inline-block";
        document.querySelector('#chatSection').style.display = "block";
        document.querySelector('#scoreArea').style.display = "block";
    });

    socket.on('nameTaken', function (data) {
        window.alert(data.msg);
        user.value = "";
        roomNum.value = "";
        socket.disconnect();
    });

    socket.on('maxLimit', function (data) {
        window.alert(data.msg);
        user.value = "";
        roomNum.value = "";
        socket.disconnect();
    });

    socket.on('joined', createUser);
    socket.on('updateRound', updateRounds);
    socket.on('updateTimer', updateTimers);
    socket.on('newRound', startRound);
    socket.on('updatePlayers', updatePlayers);
    socket.on('voteCardsUpdated', updateVoteCards);
    //socket.on('cardDrawn', cardDraw);
    socket.on('timerUpdated', updateTime);
    socket.on('updateLeader', updateLeader);
    socket.on('endGame', endGame);
    socket.on('left', removeUser);
};

window.onload = init;
