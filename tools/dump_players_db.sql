DROP DATABASE players_db;
CREATE DATABASE players_db;
USE players_db;

CREATE TABLE players (
  id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(20),
  pass CHAR(32),
  numFlags INT DEFAULT 0,
  commandId INT
);
