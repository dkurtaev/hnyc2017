var mysql = require('mysql');
var btoa = require('btoa');

module.exports = PlayersDB;

function log(msg) {
  console.log(new Date() + '] ' + msg);
}

function PlayersDB() {
  this.connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'secret',
    database: 'players_db'
  });

  this.connection.connect(function(err) {
    if (!err) {
      log('Players database connected successfully.');
    } else {
      log('Players database connection failed.');
    }
  });

  var self = this;
  setInterval(function() {
    self.connection.query('SELECT 1;');
  }, 5000);

  this.numFlagsByCommands = [0, 0, 0];
  this.numPlayersInCommands = [0, 0, 0];
  this.newPlayerCommand = 0;
};

// Check name uniquness.
// Append new player into database.
PlayersDB.prototype.signUp = function(name, pass, callback) {
  var self = this;
  var query = 'SELECT * FROM players WHERE name like binary "' + name + '"';
  self.connection.query(query, function(err, rows) {
    if (err) {
      log(err);
      callback('Server side problem.');
      return;
    }
    if (rows.length != 0) {
      callback('Player with the same name already exists.');
      return;
    }

    // Choose command.
    var commandId = self.newPlayerCommand;
    self.newPlayerCommand = (self.newPlayerCommand + 1) % 3;

    // Insert new record into database.
    query = 'INSERT INTO players (id, name, pass, commandId) VALUES ' +
            '(NULL, "' + name + '", MD5("' + pass + '"), ' + commandId + ');';
    self.connection.query(query, function(err, res) {
      if (!err) {
        var newPlayer = {
          id: res.insertId,
          name: name,
          numFlags: 0,
          commandId: commandId
        };
        self.numPlayersInCommands[commandId] += 1;
        callback(null, newPlayer);
      } else {
        log(err);
        callback('Server side problem.');
      }
    });
  });
};

PlayersDB.prototype.signIn = function(name, pass, callback) {
  var query = 'SELECT id FROM players WHERE ' +
              'name like binary "' + name + '" and ' +
              'pass = MD5("' + pass + '");';
  this.connection.query(query, function(err, rows) {
    if (!err) {
      if (rows.length != 0) {
        callback(null, rows[0].id, btoa(obfuscate(name)));
      } else {
        callback('Incorrect name or password.');
      }
    } else {
      log(err);
      callback('Server side problem.');
    }
  });
};

PlayersDB.prototype.incrementNumFlags = function(playerId, commandId) {
  var self = this;
  var query = 'UPDATE players SET numFlags = numFlags + 1 ' +
              'WHERE id = ' + playerId + ';';
  this.connection.query(query, (err) => {
    if (!err) {
      self.numFlagsByCommands[commandId] += 1;
    } else {
      log(err);
    }
  });
};

PlayersDB.prototype.getAllPlayers = function(callback) {
  var self = this;
  var query = 'SELECT * FROM players;';
  this.connection.query(query, (err, rows) => {
    if (!err) {
      callback(null, rows.map(function(row) {
        self.numFlagsByCommands[row.commandId] += row.numFlags;
        self.numPlayersInCommands[row.commandId] += 1;
        return {
          id: row.id,
          name: row.name,
          numFlags: row.numFlags,
          commandId: row.commandId
        };
      }));
    } else {
      log(err);
      callback(err);
    }
  });
};

// Append random numbers between name's characters.
function obfuscate(name) {
  return name.split('').map(function(char) {
    return Math.floor(Math.random() * 10) + char +
           Math.floor(Math.random() * 10);
  }).join('');
}
