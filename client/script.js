let canvas;
let ctx;
let socket;
let hash;
let isLeader = false;
let playedCard = false;
let hasVoted = false;
let score = 0;
const users = {};

// create user function -> if first user in room make them leader, others are normal players
// only leader can start game (must be 3 people in room at least)
const createUser = (data) => {
  hash = data.hash;
  users[hash] = data;
  if(users.length === 1)
      isLeader = true;
  else
      isLeader = false;
  gameStart(data);
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
  socket = io.connect();
  socket.on('joined', createUser);
  //socket.on('newRound', startRound);
  //socket.on('cardDrawn', cardDraw);
  //socket.on('timerUpdated', updateTime);
  socket.on('left', removeUser);
  //event listeners for onmousedown(start button), onmousedown(card), onmouseover(card)
  console.log("hello");
};

window.onload = init;