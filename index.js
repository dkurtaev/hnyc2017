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
var POST_TIMEOUT = 5e+3;
var ACTIVITY_TIMEOUT = 60e+3;
var lastDropTime = new Date();
var playersDB = new PlayersDB();
var flags = [];
var CAPTURE_RADIUS = 1e-7;  // Maximal squared distance for capturing flag.
var FLAGS_TIMEOUT = 1800e+3;  // Time after which captured flags appears again.

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
    if (player.position && now - player.lastPostTime > POST_TIMEOUT) {
      player.position = null;
    }
  });

  // Drop players with long timeout.
  if (now - lastDropTime > ACTIVITY_TIMEOUT) {
    var numReleasedPlayers = 0;
    players = players.filter(function(player) {
      if (player.position || now - player.lastPostTime < ACTIVITY_TIMEOUT) {
        return true;
      } else {
        numReleasedPlayers += 1;
        log('Player offline: ' + player.name +
            ', (' + (players.length - numReleasedPlayers) + ') players total.');
        return false;
      }
    });
    lastDropTime = now;
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'GET') {
    var requestData = url.parse(req.url, true);

    switch (requestData.pathname) {

      case '/flags': {
        // Check client authorization.
        var player = players.find(function(player) {
          return player.authKey === requestData.query.authKey;
        });
        if (player === undefined) {
          res.end(RESPONSES.UNAUTHORIZED);
          return;
        }

        var flagIdx = 0;
        responseData.flags = flags.filter(function(flag) {
          if (flag.captured && now - flag.captureTime >= FLAGS_TIMEOUT) {
            flag.captured = false;
            log('Flag ' + flagIdx + ' appeared.');
          }
          flagIdx += 1;
          return !flag.captured;
        }).map(function(flag) {
          return {position: flag.position};
        });

        res.end(JSON.stringify(responseData));
        break;
      }

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

        var signInCallback = function(err, id, key, numFlags) {
          if (!err) {
            var player = players.find(function(player) {
              return player.name === playerData.name;
            });
            if (player === undefined) {
              player = {
                id: id,
                name: playerData.name,
                authKey: key,
                numFlags: numFlags,
                position: null,
                lastPostTime: null
              };
              players.push(player);
              responseData.authKey = key;
              log('Player online: ' + player.name +
                  ', (' + players.length + ') players total.');
            } else {
              if (!player.position) {
                player.authKey = key;
                responseData.authKey = key;
                log('Player online: ' + player.name +
                    ', (' + players.length + ') players total.');
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
        };

        playersDB.signIn(playerData.name, playerData.pass, signInCallback);
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

          // Capture the flags.
          for (var i = 0, l = flags.length; i < l; ++i) {
            if (flags[i].captured) {
              continue;
            }
            var distance_sq =
                Math.pow(player.position.lat - flags[i].position.lat, 2) +
                Math.pow(player.position.lng - flags[i].position.lng, 2);
            if (distance_sq <= CAPTURE_RADIUS) {
              log('Player ' + player.name + ' captured flag ' + i);
              player.numFlags += 1;
              flags[i].captured = true;
              flags[i].captureTime = now;
              playersDB.updateNumFlags(player.id, player.numFlags);
              break;
            }
          }

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

fs.readFile('markers.json', 'utf8', (err, data) => {
  if (!err) {
    flags = JSON.parse(data).map(function(position) {
      return {
        position: position,
        captured: false,
        captureTime: null
      };
    });
  } else {
    log(err);
  }
});

var options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};
var server = https.createServer(options, callback);
server.listen(56582);
