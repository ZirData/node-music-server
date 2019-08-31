"use strict"
// Define the single instance of the database for the app.
const db_file    = 'songDatabase.sqlite3';
let   sqlite3    = require('sqlite3').verbose();
let   db         = new sqlite3.Database(db_file);

function restart(){
  db = new sqlite3.Database(db_file);
  return db;
}

module.exports = db;
module.exports.restart = restart;