"use strict"

let sqlite3 = require('sqlite3');
let db = new sqlite3.Database('songDatabase.sqlite3');
db.run("CREATE TABLE Song (id INTEGER PRIMARY KEY AUTOINCREMENT, song_name TEXT, artist_name TEXT, album_name TEXT)");
db.close();
console.log("Done...");