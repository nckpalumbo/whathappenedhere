class User {
  constructor(userID) {
    this.userID = userID;
    this.lastUpdate = new Date().getTime();
    this.hand = [];
    this.host = false;
    this.room = '';
  }
}

module.exports = User;
