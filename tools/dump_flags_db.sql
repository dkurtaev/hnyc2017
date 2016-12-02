DROP DATABASE IF EXISTS flags_db;
CREATE DATABASE flags_db;
USE flags_db;

CREATE TABLE flags (
  id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
  lat FLOAT,
  lng FLOAT,
  messages JSON
);
