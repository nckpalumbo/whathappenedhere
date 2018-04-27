let canvas;
let ctx;
let socket;
let hash;
let isLeader = false;
let playedCard = false;
let hasVoted = false;
let outcome;
let score = 0;
let users = {};
let voteCards = {};
let outcomeBack;
let explainBack;
let emptyHorizontal;
let emptyVertical;

// create user function -> if first user in room make them leader, others are normal players
// only leader can start game (must be 3 people in room at least)
const createUser = (data) => {
  hash = data.userID;
  users[hash] = data;
  if(users.length === 1)
      isLeader = true;
  else
      isLeader = false;
  gameStart(data);
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
    users = data;
};

// game function -> prompts leader to start game if there are at least 3 players in room
const gameStart = (data) => {
  if(users.length >= 3) {
      // show start button; if leader clicks it, hide button and begin game
      //socket.emit('roundStart');
  }
    socket.emit('roundStart');
};

// game update -> prompts players to make card selection; prompts server when a card is picked or time runs out
const gameUpdate = (data) => {
    // starts timer at 60 seconds and counts down
    // tells client to click on a card (eventually when hovered over, make it increase in y value to show it is hovered)
    // on click event where when user plays card, it leaves their hand and joins the pile near the outcome card
    // socket.emit('drawCard', ()); after user plays card
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
    
    // Draw the outcome card
    ctx.font = cardStyle.outcomeFont;
    ctx.fillStyle = cardStyle.cardColor;
    ctx.fillStyle = cardStyle.textColor;
    ctx.drawImage(outcomeBack, outcome.x - 225, outcome.y);
    ctx.drawImage(emptyHorizontal, outcome.x + 100, outcome.y);
    displayWrappedText(ctx, outcome.text, outcome.x + 110, outcome.y + 45, outcomeMaxWidth, lineHeight)
    ctx.font = ("32px Helvetica");
    ctx.fillText("Because ", (canvas.width / 2) - 60, (canvas.height / 3) - 50, 200);
    
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
    for(let i = 0; i < voteKeys.length; i++) {
        ctx.fillStyle = cardStyle.cardColor;
        ctx.fillRect((50 + i*200), (canvas.height / 3), cardStyle.explainWidth, cardStyle.explainHeight);
        ctx.fillStyle = cardStyle.textColor;
        ctx.fillText(voteCards[voteKeys[i]].text, (10 + i*200), (canvas.height / 3) + 30, 150);
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
    if(!playedCard){
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
    outcome = data;
    draw();
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
  const connect = document.querySelector("#connect");         
  connect.addEventListener('click', connectSocket);
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

  socket.on('letJoin', (data) => {
      socket.emit('join', { name: data.name, room: data.roomNum }); 
      document.querySelector('#connect').style.display = "none";
      document.querySelector('#startRoom').style.display = "none";
      document.querySelector('#canvas').style.display = "block";
      //document.querySelector('#webChat').style.display = "block";
  });

  socket.on('nameTaken', (data) => {
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
  //socket.on('timerUpdated', updateTime);
  socket.on('left', removeUser);
};

window.onload = init;