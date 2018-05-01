let canvas;
let ctx;
let socket;
let hash;
let isLeader = false;
let playedCard = false;
let hasVoted = false;
let outcome;
let score = 0;
let timer = 0;
let origTimer = 0;
let users = {};
let voteCards = {};
let outcomeBack;
let explainBack;
let emptyHorizontal;
let emptyVertical;
let length;
let numRounds;
let state = 0;
let scoreBox;

// Create an object to hold the gamestates
const GAMESTATE = {
    START: 0,
    SELECT: 1,
    VOTE: 2,
    ENDROUND: 3,
};

// create user function -> if first user in room make them leader, others are normal players
// only leader can start game (must be 3 people in room at least)
const createUser = (data) => {
  hash = data.id;
  users[hash] = data.user;
  if(data.length === 1)
      isLeader = true;
  else
      isLeader = false;
  gameStart(data);
  console.log(isLeader);
};

const cardStyle = {
  outcomeWidth: 300,
  outcomeHeight: 200,
  explainWidth: 150,
  explainHeight: 250,
  outcomeFont: '28px Papyrus',
  explainFont: '24px Papyrus',
  cardColor: 'lightgrey',
  textColor: 'black',
};

const displayWrappedText = (context, text, x, y, maxWidth, lineHeight) => {
  var words = text.split(' ');
  var line = '';
    
  for(let i = 0; i < words.length; i++){
    var testLine = line + words[i] + ' ';
    var measures = context.measureText(testLine);
    var testWidth = measures.width;
    if(testWidth > maxWidth && i > 0){
      context.fillText(line, x, y);
      line = words[i] + ' ';
      y += lineHeight;
    }
    else{
      line = testLine;
    }
  }
  context.fillText(line, x, y);
};

// Update the list of players
const updatePlayers = (data) => {
    users = data.room;
    length = data.length;
    console.log(length);
    const keys = Object.keys(users);
    let scoreDisplay = "";
    for(let i = 0; i < keys.length; i++) {
        let user = users[keys[i]]
        scoreDisplay += user.name + ": " + user.score + "\n";
    }
    scoreBox.innerHTML = scoreDisplay;
};

// Update the timer
const updateTime = (data) => {
    timer = data;
};

// game function -> prompts leader to start game if there are at least 3 players in room
const gameStart = (data) => {
    const start = document.querySelector('#start');
    const roundSlider = document.querySelector('#roundSlider');
    const timeSlider = document.querySelector('#timeSlider');
    if(isLeader) {
        start.disabled = false;
        roundSlider.disabled = false;
        timeSlider.disabled = false;
    }
    else {
        start.disabled = true;
        roundSlider.disabled = true;
        timeSlider.disabled = true;
    }
    start.addEventListener('click', () => {
        if(length >= 3 && isLeader) {
            origTimer = timeSlider.value;
            timer = timeSlider.value;
            numRounds = roundSlider.value;
            console.log(timer + " " + numRounds);
            socket.emit('roundStart');
        }
    });
    roundSlider.addEventListener('change', () => {
        socket.emit('roundNumChange', roundSlider.value); 
    });
    timeSlider.addEventListener('change', () => {
       socket.emit('timeNumChange', timeSlider.value); 
    });
};

const updateRounds = (data) => {
    const roundSlider = document.querySelector('#roundSlider');
    const roundAmount = document.querySelector('#roundAmount');
    roundSlider.value = data;
    roundAmount.innerHTML = data;
    
};

const updateTimers = (data) => {
    const timeSlider = document.querySelector('#timeSlider');
    const timeAmount = document.querySelector('#timeAmount');
    timeSlider.value = data;
    timeAmount.innerHTML = data;
};
// game update -> prompts players to make card selection; prompts server when a card is picked or time runs out
const gameUpdate = () => {
    // starts timer at player selected value in seconds and counts down
    ctx.fillStyle = "lightblue";
    ctx.fillRect(944, 0, 80, 80);
    ctx.font = ("32px Helvetica");
    ctx.fillStyle = cardStyle.textColor;
    if(timer > 0 && (state === GAMESTATE.SELECT || state === GAMESTATE.VOTE)) {
        socket.emit('timerUpdate', timer);
        ctx.fillText(timer, 950, 30);
    } else if (timer <= 0){
        timer = 0;
        ctx.fillText(timer, 950, 30);
        if(state === GAMESTATE.SELECT) {
            state++;
            timer = origTimer;
        }
        draw();
    }
    // tells client to click on a card (eventually when hovered over, make it increase in y value to show it is hovered)
    // on click event where when user plays card, it leaves their hand and joins the pile near the outcome card
    // socket.emit('drawCard', ()); after user plays card
    
    // Counts up the votes when all the voting state is over
    if(state === GAMESTATE.ENDROUND) {
        let keys = Object.keys(voteCards);
        for(let i = 0; i < keys.length; i++) {
            users[keys[i]].score += voteCards[keys[i]].votes;
            socket.emit('scoreUpdated', users[keys[i]].score);
        }
    }
    console.log("state: " + state);
};

// Draw the game
const draw = () => {
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "lightblue";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    let outcomeMaxWidth = 230;
    let explainMaxWidth = 135;
    let lineHeight = 30;
    
    ctx.font = ("32px Helvetica");
    ctx.fillStyle = cardStyle.textColor;
    if(timer > 0)
        ctx.fillText(timer, 950, 30);
    else
        ctx.fillText('0', 950, 30);
    
    // Draw the outcome card
    ctx.font = cardStyle.outcomeFont;
    ctx.fillStyle = cardStyle.cardColor;
    ctx.fillStyle = cardStyle.textColor;
    ctx.drawImage(outcomeBack, outcome.x - 225, outcome.y);
    ctx.drawImage(emptyHorizontal, outcome.x + 100, outcome.y);
    displayWrappedText(ctx, outcome.text, outcome.x + 110, outcome.y + 45, outcomeMaxWidth, lineHeight)
    ctx.font = ("32px Helvetica");
    ctx.fillText("Because... ", (canvas.width / 2) - 60, (canvas.height / 3) - 50, 200);
    
    // Draw the player's hand
    ctx.font = cardStyle.explainFont;
    for(let i = 0; i < users[hash].hand.length; i++) {
        const card = users[hash].hand[i];
        ctx.drawImage(emptyVertical, card.x + 30, card.y - 60);
        ctx.font = cardStyle.explainFont;
        ctx.fillStyle = cardStyle.cardColor;
        ctx.fillStyle = cardStyle.textColor;
        displayWrappedText(ctx, card.text, card.x + 40, card.y - 15, explainMaxWidth, lineHeight + 5)
    }
    
    // Draw the cards that are being voted on
    ctx.font = cardStyle.explainFont;
    const voteKeys = Object.keys(voteCards);
    console.log(voteKeys.length + " " + length);
    for(let i = 0; i < voteKeys.length; i++) {
        if(voteKeys.length < length && timer > 0) {
            ctx.drawImage(explainBack, (40 + i*200), 250);
            ctx.fillStyle = cardStyle.cardColor;
            ctx.fillStyle = cardStyle.textColor;
        }
        else if(voteKeys.length == length) {
            ctx.drawImage(emptyVertical, (40 + i*200), 250);
            ctx.fillStyle = cardStyle.cardColor;
            ctx.fillStyle = cardStyle.textColor;
            displayWrappedText(ctx, voteCards[voteKeys[i]].text, (50 + i*200), 295, explainMaxWidth, lineHeight + 5)
            //timer = origTimer;
        }
    }
    
};

// Update the explanations that have been submitted
const updateVoteCards = (data) => {
    voteCards = data;
    draw();
};

// Get the mouse
const getMouse = (e) => {
    let mouse = {};
    mouse.x = e.pageX - e.target.offsetLeft;
    mouse.y = e.pageY - e.target.offsetTop;
	return mouse;
};

// Handle when the player clicks the mouse
const mouseDownHandle = (e) => {
    let hand = users[hash].hand;
    const mouse = getMouse(e);
    if(!playedCard && state === GAMESTATE.SELECT){
        for(let i = 0; i < hand.length; i++) {
            if(mouse.x < ((hand[i].x + 30) + hand[i].width) && 
                mouse.x > (hand[i].x + 30) &&
                mouse.y < ((hand[i].y - 60) + hand[i].height) &&
                mouse.y > (hand[i].y - 60)) {
                hand[i].clicked = true;
                break;
            }
        }
    }
    
    if(state === GAMESTATE.VOTE) {
        const voteKeys = Object.keys(voteCards);
        for(let i = 0; i < voteKeys.length; i++) {
            if(mouse.x < (voteCards[voteKeys[i]].x + voteCards[voteKeys[i]].width) && 
                mouse.x > voteCards[voteKeys[i]].x &&
                mouse.y < (voteCards[voteKeys[i]].y + voteCards[voteKeys[i]].height) &&
                mouse.y > voteCards[voteKeys[i]].y) {
                voteCards[voteKeys[i]].votes++;
                break;
            }
        }
    }
};

// Handle when the player releases the mouse
const mouseUpHandle = (e) => {
    let hand = users[hash].hand;
    const mouse = getMouse(e);
    for(let i = 0; i < hand.length; i++) {
        if(hand[i].clicked) {
            playedCard = true;
            socket.emit("cardPicked", hand[i]);
            //hand.splice(i);
            break;
        }
    }
};

// Start a new round
const startRound = (data) => {
    document.querySelector('#start').style.display = "none";
    document.querySelector('#roundSlider').style.display = "none";
    document.querySelector('#timeSlider').style.display = "none";
    document.querySelector('#roundLabel').style.display = "none";
    document.querySelector('#timeLabel').style.display = "none";
    document.querySelector('#roundAmount').style.display = "none";
    document.querySelector('#timeAmount').style.display = "none";
    outcome = data;
    setInterval(gameUpdate, 1000);
    state++;
    draw();
};

//Send messages
var sendMessage = function sendMessage(e) {
    var messageSend = document.querySelector('#message').value;
    let user = document.querySelector("#username").value;
    if (messageSend){
        socket.emit('msgToServer', { user: user, msg: messageSend });
    }
    document.querySelector('#message').value = '';
};

// voting function -> reveals all cards and prompts players to vote; prompts server when vote is made or time runs out

// results function -> reveals how many votes each card got, and gives corresponding player correct amount of points

// end game function -> ends game if player has reached max points, or less than 3 people left in room

// in app purchases function -> let's players "buy" packs for $$ or in-game currency (points); probably just make all free for game

// delete user function -> if they leave room, erase their data
const removeUser = (data) => {
  if (users[data]) {
    delete users[data];
  }
};

// random num const
const randomNum = r => Math.floor(Math.random() * r);

const init = () => {
  canvas = document.querySelector('#canvas');
  ctx = canvas.getContext('2d');
    scoreBox = document.querySelector('#scoreZone');
  const connect = document.querySelector("#connect");    
  connect.addEventListener('click', connectSocket);
  const chat = document.querySelector('#chat');
  chat.innerHTML = "";
  //event listeners for onmousedown(start button), onmousedown(card),
  canvas.onmousedown = mouseDownHandle;
  canvas.onmouseup = mouseUpHandle;
    
  outcomeBack = document.querySelector("#outcBack");
  explainBack = document.querySelector("#explBack");
  emptyHorizontal = document.querySelector("#emptyHor");
  emptyVertical = document.querySelector("#emptyVer");
};

const connectSocket = () => {
  socket = io.connect();
  let user = document.querySelector("#username").value;
  let roomNum = document.querySelector("#roomNum").value;
  console.log(user + " " + roomNum);
  socket.on('connect', () => {
      if(!user) {
          user = 'unknown';   
      }
      socket.emit('searchRoom', {name: user, room: roomNum});
  });
    
  message.addEventListener('keyup', function (e) {
      e.preventDefault();
      if(e.keyCode === 13) {
         sendMessage();
         message.value = '';
      }
  });

  socket.on('msgToClient', (data) => {
      chat.innerHTML += data.user + ": " + data.msg + '\n';
  });
    
  document.querySelector('#send').onclick = sendMessage;

  socket.on('letJoin', (data) => {
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
      document.querySelector('#webChat').style.display = "block";
      document.querySelector('#score').style.display = "block";
  });

  socket.on('nameTaken', (data) => {
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
  socket.on('left', removeUser);
};

window.onload = init;