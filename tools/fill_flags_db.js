var fs = require('fs');
var mysql = require('mysql');

var connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'secret',
  database: 'flags_db'
});

fs.readFile('markers.json', 'utf8', (err, data) => {
  if (!err) {
    connection.connect(function(err) {
      if (err) {
        console.log('Flags database connection failed.');
      }
    });

    JSON.parse(data).forEach(function(position) {
      var query = 'INSERT INTO flags (id, lat, lng, messages) VALUES ' +
                  '(NULL,' + position.lat + ',' + position.lng + ',"[]");';
      connection.query(query, function(err) {
        if (err) {
          console.log(err);
        }
      });
    });

    connection.end();
  } else {
    console.log(err);
  }
});
