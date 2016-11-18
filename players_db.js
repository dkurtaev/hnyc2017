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
};

// Check name uniquness.
// Append new player into database.
PlayersDB.prototype.signUp = function(name, pass, callback) {
  var self = this;
  var query = 'SELECT * FROM players WHERE name = "' + name + '"';
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
    query = 'INSERT INTO players (id, name, pass) VALUES ' +
            '(NULL, "' + name + '", MD5("' + pass + '"));';
    self.connection.query(query, function(err, res) {
      if (!err) {
        var newPlayer = {
          id: res.insertId,
          name: name,
          numFlags: 0
        };
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
              'name = "' + name + '" and ' +
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

PlayersDB.prototype.updateNumFlags = function(playerId, numFlags) {
  var query = 'UPDATE players SET numFlags = ' + numFlags +
              ' WHERE id = ' + playerId + ';';
  this.connection.query(query, (err) => {
    if (err) {
      log(err);
    }
  });
};

PlayersDB.prototype.getAllPlayers = function(callback) {
  var query = 'SELECT * FROM players;';
  this.connection.query(query, (err, rows) => {
    if (!err) {
      callback(null, rows.map(function(row) {
        return {
          id: row.id,
          name: row.name,
          numFlags: row.numFlags
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
