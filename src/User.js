class User {
  constructor(userID, name, room) {
    this.userID = userID;
    this.lastUpdate = new Date().getTime();
    this.hand = [];
    this.host = false;
    this.name = name;
    this.room = room;
  }
}

module.exports = User;
