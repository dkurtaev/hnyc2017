#!/bin/sh

cd tools
sh dump_players_db.sh
sh dump_flags_db.sh

cd ..
node tools/fill_flags_db.js
