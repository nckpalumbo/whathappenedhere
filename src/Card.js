class Card {
  constructor(text, x, y, width, height) {
    this.text = text;
    this.lastUpdate = new Date().getTime();
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.clicked = false;
    this.votes = 0;
  }
}

module.exports = Card;
