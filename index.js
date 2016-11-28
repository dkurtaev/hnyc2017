var fs = require('fs');
var url = require('url');
var https = require('https');
var atob = require('atob');
var PlayersDB = require('./players_db.js');
var FlagsDB = require('./flags_db.js');

// Each player has properties:
// {
//   authKey:  // string.
//   name:  // string.
//   position: {
//     lat:  // latitude.
//     lng:  // longitude.
//   }
//   lastPostTime:  // time of last POST query from this player.
//   isOnline:  // True or false.
//   isActive:  // Indicates that player sends geolocation.
// }
var allPlayers = [];
var playersOnline = [];
var POST_TIMEOUT = 5e+3;
var ACTIVITY_TIMEOUT = 300e+3;
var playersDB = new PlayersDB();
var flags = [];
var CAPTURE_RADIUS = 1e-7;  // Maximal squared distance for capturing flag.
var FLAGS_TIMEOUT = 1800e+3;  // Time after which captured flags appears again.
var eventsLog = [];
var EVENTS_LOG_DEPTH = 10;
var flagsDB = new FlagsDB();

// Update is procedure with dropping inactive players and appearing flags.
var lastUpdateTime = new Date();
var UPDATE_PERIOD = 60e+3;

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

function logEvent(msg) {
  eventsLog.unshift(msg);
  while (eventsLog.length > EVENTS_LOG_DEPTH) {
    eventsLog.pop();
  }
}

var callback = function(req, res) {
  var player = null;
  var requestData = url.parse(req.url, true);

  if (requestData.pathname == '/flags' ||
      requestData.pathname == '/log' ||
      requestData.pathname == '/players' ||
      requestData.pathname == '/flag_comment' ||
      requestData.pathname == '/geolocation') {
    // Check client authorization.
    player = playersOnline.find(function(player) {
      return player.authKey === requestData.query.authKey;
    });
    if (player === undefined) {
      res.end(RESPONSES.UNAUTHORIZED);
      return;
    }
  }

  var now = new Date();
  var responseData = {
    status: 200,  // Ok.
    error: null
  };

  // Mark inactive players.
  playersOnline.forEach(function(player) {
    if (player.isActive && now - player.lastPostTime > POST_TIMEOUT) {
      player.isActive = false;
    }
  });

  // Updates.
  if (now - lastUpdateTime > UPDATE_PERIOD) {
    // Release players.
    var numReleasedPlayers = 0;
    playersOnline = playersOnline.filter(function(player) {
      if (player.isActive || now - player.lastPostTime < ACTIVITY_TIMEOUT) {
        return true;
      } else {
        player.isOnline = false;
        numReleasedPlayers += 1;
        log('Player offline: ' + player.name +
            ', ' + (playersOnline.length - numReleasedPlayers) +
            ' players total.');
        logEvent('Player <b>' + player.name +
                 '</b> is <span style="color: red">offline</span>');
        return false;
      }
    });

    // Flags appearing.
    for (var i = 0, l = flags.length; i < l; ++i) {
      var flag = flags[i];
      if (flag.captured && now - flag.captureTime >= FLAGS_TIMEOUT) {
        flag.captured = false;
        log('Flag ' + i + ' appeared.');
      }
    }

    lastUpdateTime = now;
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'GET') {
    switch (requestData.pathname) {

      case '/flags': {
        responseData.flags = flags.map(function(flag) {
          return {
            position: flag.position,
            captured: flag.captured,
            messages: JSON.stringify(flag.messages),
            timeToAppearing: FLAGS_TIMEOUT - (now - flag.captureTime)
          };
        });
        res.end(JSON.stringify(responseData));
        break;
      }

      case '/log': {
        responseData.log = eventsLog.join('<br>');
        res.end(JSON.stringify(responseData));
        break;
      }

      case '/icon_purple.png': case '/icon_gold.png': case '/icon_blue.png':
      case '/icon_gray.png': case '/icon_green.png':
      case '/icon_green_star.png': case '/icon_gray_star.png': {
        fs.readFile('images' + requestData.pathname, (err, data) => {
          if (!err) {
            res.writeHead(200, {'Content-Type': 'image/png'});
            res.end(data);
          } else {
            res.end(RESPONSES.SERVER_ERR);
          }
        });
        break;
      }

      case '/players': {
        responseData.players = allPlayers.map(function(player) {
          return {
            name: player.name,
            numFlags: player.numFlags,
            isOnline: player.isOnline,
            commandId: player.commandId
          };
        });
        res.end(JSON.stringify(responseData));
        break;
      }

      case '/statistics': {
        responseData.numFlagsByCommands =
            JSON.stringify(playersDB.numFlagsByCommands);
        res.end(JSON.stringify(responseData));
        break;
      }

      case '/index.html': case '/map.html': case '/fir_tree.html':
      case '/tree.js': case '/shaders_factory.js': case '/twinkles.js': {
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

    switch (requestData.pathname) {

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
        playersDB.signUp(playerData.name, playerData.pass, (err, newPlayer) => {
          if (!err) {
            log('New player: ' + newPlayer.name +
                ' in command ' + newPlayer.commandId);
            newPlayer.authKey = null;
            newPlayer.isOnline = false;
            newPlayer.isActive = false;
            newPlayer.lastPostTime = null;
            allPlayers.unshift(newPlayer);
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

        var signInCallback = function(err, id, authKey) {
          if (!err) {
            var player = allPlayers.find(function(player) {
              return player.id === id;
            });

            if (!player.isOnline) {
              player.isOnline = true;
              player.authKey = authKey;
              playersOnline.push(player);
              responseData.authKey = authKey;
              log('Player online: ' + player.name +
                  ', ' + playersOnline.length + ' players total.');
              logEvent('Player <b>' + player.name +
                       '</b> is <span style="color: green">online</span>');
            } else {
              if (!player.isActive) {
                player.authKey = authKey;
                responseData.authKey = authKey;
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
        if (!playerData.hasOwnProperty('position') ||
            !playerData.position.hasOwnProperty('lat') ||
            !playerData.position.hasOwnProperty('lng')) {
          res.end(RESPONSES.BAD_REQUEST);
          break;
        }

        player.isActive = true;
        player.lastPostTime = now;

        // Capture the flags.
        for (var i = 0, l = flags.length; i < l; ++i) {
          if (flags[i].captured) {
            continue;
          }
          var distance_sq =
              Math.pow(playerData.position.lat - flags[i].position.lat, 2) +
              Math.pow(playerData.position.lng - flags[i].position.lng, 2);
          if (distance_sq <= CAPTURE_RADIUS) {
            log('Player ' + player.name + ' captured flag ' + i);
            player.numFlags += 1;
            flags[i].captured = true;
            flags[i].captureTime = now;
            playersDB.incrementNumFlags(player.id, player.commandId);
            logEvent('Player <b>' + player.name + '</b> captured flag!');
            responseData.flagCaptured = true;
            responseData.capturedFlagId = i;
            break;
          }
        }
        res.end(JSON.stringify(responseData));
        break;
      }

      case '/flag_comment': {
        var playerData = JSON.parse(data);
        if (!playerData.hasOwnProperty('position') ||
            !playerData.position.hasOwnProperty('lat') ||
            !playerData.position.hasOwnProperty('lng') ||
            !playerData.hasOwnProperty('msg') ||
            !playerData.hasOwnProperty('flagId')) {
          res.end(RESPONSES.BAD_REQUEST);
          break;
        }

        var flagId = playerData.flagId;
        var distance_sq =
            Math.pow(playerData.position.lat - flags[flagId].position.lat, 2) +
            Math.pow(playerData.position.lng - flags[flagId].position.lng, 2);
        if (distance_sq <= CAPTURE_RADIUS) {
          var msg = '<b>' + player.name + '</b>: ' + playerData.msg;
          flags[flagId].messages.push(msg);
          flagsDB.updateMessages(flags[flagId]);
        }

        res.end(RESPONSES.OK);
        break;
      }

      default:
        res.end(RESPONSES.METHOD_NOT_ALOWED);
        break;
    }
  });
};

function startServer() {
  var options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
  };
  var server = https.createServer(options, callback);
  server.listen(56582);
}

function loadPlayers() {
  playersDB.getAllPlayers((err, players) => {
    if (!err) {
      allPlayers = players.map(function(player) {
        return {
          id: player.id,
          name: player.name,
          numFlags: player.numFlags,
          authKey: null,
          isOnline: false,
          isActive: false,
          lastPostTime: null,
          commandId: player.commandId
        };
      });
      startServer();
    }
  });
}

function loadFlags() {
  flagsDB.getAllFlags((err, allFlags) => {
    if (!err) {
      flags = allFlags.map(function(flag) {
        return {
          id: flag.id,
          position: flag.position,
          messages: flag.messages,
          captured: false,
          captureTime: null
        };
      });
      loadPlayers();
    }
  });
}

loadFlags();
