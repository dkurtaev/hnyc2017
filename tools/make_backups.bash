#!/bin/bash

if [ ! -d backups ]; then
  mkdir backups
fi

while true; do
  now=$(date +%s)

  # Type for restore:
  # mysql --user=root --password=secret flags_db < /path/to/sql/file
  mysqldump \
    --user=root \
    --password=secret \
    flags_db flags > "backups/flags_${now}.sql"

  # Type for restore:
  # mysql --user=root --password=secret players_db < /path/to/sql/file
  mysqldump \
    --user=root \
    --password=secret \
    players_db players > "backups/players_${now}.sql"

  cp hnyc2017.log "backups/hnyc2017_${now}.log"

  sleep 3600
done
