var fs = require('fs');
var url = require('url');
var https = require('https');
var atob = require('atob');
var PlayersDB = require('./players_db.js');

// Each player has properties:
// {
//   authKey:  // string.
//   name:  // string.
//   position: {
//     lat:  // latitude.
//     lng:  // longitude.
//   }
//   lastPostTime:  // time of last POST query from this player.
// }
var players = [];
var postTimeout = 5000;
var activityTimeout = 60000;
var lastDropTime = new Date();
var playersDB = new PlayersDB();

var RESPONSES = {
  OK:
    JSON.stringify({status: 200, error: null}),
  BAD_REQUEST:
    JSON.stringify({status: 400, error: 'Unknown request method.'}),
  UNAUTHORIZED:
    JSON.stringify({status: 401, error: 'Unauthorized request.'}),
  METHOD_NOT_ALOWED:
    JSON.stringify({status: 405, error: 'Unknown request URL.'}),
  SERVER_ERR:
    JSON.stringify({status: 500, error: 'Internal server error.'})
};

function log(msg) {
  console.log(new Date() + '] ' + msg);
}

var callback = function(req, res) {
  var now = new Date();
  var responseData = {
    status: 200,  // Ok.
    error: null
  };

  // Mark inactive players.
  players.forEach(function(player) {
    if (player.position && now - player.lastPostTime > postTimeout) {
      player.position = null;
    }
  });

  // Drop players with long timeout.
  if (now - lastDropTime > activityTimeout) {
    players = players.filter(function(player) {
      if (player.position || now - player.lastPostTime < activityTimeout) {
        return true;
      } else {
        log('Player offline: ' + player.name +
            ' (' + (players.length - 1) + ') total.');
        return false;
      }
    });
    lastDropTime = now;
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'GET') {
    var requestData = url.parse(req.url, true);

    switch (requestData.pathname) {

      case '/index.html': case '/map.html': {
        var callback = function(err, data) {
          res.end(!err ? data : RESPONSES.SERVER_ERR);
        };
        fs.readFile('client' + requestData.pathname, 'utf8', callback);
        break;
      }

      default:
        res.end(RESPONSES.METHOD_NOT_ALOWED);
        break;
    }
  }

  req.on('data', function(data) {
    if (req.method !== 'POST') {
      res.end(RESPONSES.BAD_REQUEST);
      return;
    }

    switch (req.url) {

      case '/sign_up': {
        // POST data:
        // {
        //   name:  // string.
        //   pass:  // string.
        // }
        var playerData = JSON.parse(atob(data.toString()));
        if (!playerData.hasOwnProperty('name') ||
            !playerData.hasOwnProperty('pass')) {
          res.end(RESPONSES.BAD_REQUEST);
          break;
        }
        playersDB.signUp(playerData.name, playerData.pass, function(err) {
          if (!err) {
            log('New player: ' + playerData.name);
          } else {
            responseData.status = RESPONSES.UNAUTHORIZED.status;
            responseData.error = err;
          }
          res.end(JSON.stringify(responseData));
        });
        break;
      }

      case '/sign_in': {
        // POST data:
        // {
        //   name:  // string.
        //   pass:  // string.
        // }
        var playerData = JSON.parse(atob(data.toString()));
        if (!playerData.hasOwnProperty('name') ||
            !playerData.hasOwnProperty('pass')) {
          res.end(RESPONSES.BAD_REQUEST);
          break;
        }
        playersDB.signIn(playerData.name, playerData.pass, function(err, key) {
          if (!err) {
            var player = players.find(function(player) {
              return player.name === playerData.name;
            });
            if (player === undefined) {
              player = {
                name: playerData.name,
                authKey: key,
                position: null,
                lastPostTime: null
              }
              players.push(player);
              responseData.authKey = key;
              log('Player online: ' + player.name +
                  ' (' + players.length + ') players total.');
            } else {
              if (!player.position) {
                player.authKey = key;
                responseData.authKey = key;
                log('Player online: ' + player.name +
                    ' (' + players.length + ') players total.');
              } else {
                responseData.status = RESPONSES.UNAUTHORIZED.status;
                responseData.error = 'Player already authorized.';
              }
            }
          } else {
            responseData.status = RESPONSES.UNAUTHORIZED.status;
            responseData.error = err;
          }
          res.end(JSON.stringify(responseData));
        });
        break;
      }

      case '/geolocation': {
        // POST data:
        // {
        //   authKey:  // string.
        //   position: {
        //     lat:  // latitude.
        //     lng:  // longitude.
        //   }
        // }
        var playerData = JSON.parse(data);
        if (!playerData.hasOwnProperty('authKey') ||
            !playerData.hasOwnProperty('position') ||
            !playerData.position.hasOwnProperty('lat') ||
            !playerData.position.hasOwnProperty('lng')) {
          res.end(RESPONSES.BAD_REQUEST);
          break;
        }

        var player = players.find(function(player) {
          return player.authKey === playerData.authKey;
        });

        if (player !== undefined) {
          player.position = playerData.position;
          player.lastPostTime = now;
          res.end(RESPONSES.OK);
        } else {
          res.end(RESPONSES.UNAUTHORIZED);
        }
      }

      default:
        res.end(RESPONSES.METHOD_NOT_ALOWED);
        break;
    }
  });
};

var options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};
var server = https.createServer(options, callback);
server.listen(56582);
