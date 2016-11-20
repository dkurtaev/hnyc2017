var mysql = require('mysql');

module.exports = FlagsDB;

function log(msg) {
  console.log(new Date() + '] ' + msg);
}

function FlagsDB() {
  this.connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'secret',
    database: 'flags_db'
  });

  this.connection.connect(function(err) {
    if (!err) {
      log('Flags database connected successfully.');
    } else {
      log('Flags database connection failed.');
    }
  });
};

FlagsDB.prototype.updateMessages = function(flag) {
  var query = 'UPDATE flags SET messages=\'' + JSON.stringify(flag.messages) +
              '\' WHERE id = ' + flag.id + ';';
  this.connection.query(query, (err) => {
    if (err) {
      log(err);
    }
  });
};

FlagsDB.prototype.getAllFlags = function(callback) {
  var query = 'SELECT * FROM flags;';
  this.connection.query(query, (err, rows) => {
    if (!err) {
      callback(null, rows.map(function(row) {
        return {
          id: row.id,
          position: {
            lat: row.lat,
            lng: row.lng
          },
          messages: JSON.parse(row.messages)
        };
      }));
    } else {
      log(err);
      callback(err);
    }
  });
};
