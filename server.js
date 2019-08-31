const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const port = 3000;
const app = express();
const path = require('path');
const db   = require('./database.js');
const formidable = require('formidable');
const crypto = require('crypto');
app.use( express.static(__dirname + '/assets'));
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


/*Gets the homepage that contains a link to the upload feature
and the play list. */
app.get("/",function(req,res){
  var message ='';
  res.render("home page");
});

/*Opens the server to listen on port 3000*/
app.listen(port,function(req,res){
  console.log("Listening on " + port + " for Yfitops");
});

/*Gives the html file to the user
for to search through and listen to music in the database
NoSong is a special version of PlayList.ejs that assumes the user 
hasn't preformed any actions yet

message is used to communicate to the user regarding if server actions are successful 
or failed */
app.get("/PlayList",function(req,res){
  var message = ""; // blank assuming the user has not tried anything
  res.render("NoSong",{message});
});
/* Allows the user to access the playlist if they try to access it from 
a url with a previous search*/
app.get("/search",function(req,res){
  var message = ""; // blank since user tried getting to webiste through a search action
  res.render("NoSong",{message});
});
/*Used by the html audio tag when it trys to retrieve source files from the 
server. Note that this assumes that files are stored in media folder from the root.
*/
app.get('/media/:Song', function(req, res){
   var filePath = `media/${req.params.Song}`; // gets file path for delivery 
    var stat = fs.statSync(filePath);
    var total = stat.size;
    if (req.headers.range) { // if header.range is not zero
        var range = req.headers.range
        var newRange = range.replace(/bytes=/, "").split("-"); // scrub header string for non-numeric characters
        var newStart = parseInt(newRange[0], 10); // convert from string to int 
        var newEnd = newRange[1] ? parseInt(newRange[1], 10) : total-1; // convert from string to int if the end isnt specified then the end is the end of the file - 1 byte
        var readStream = fs.createReadStream(filePath, {start: newStart, end: newEnd}); // create readstream with the offset
        res.writeHead(206, { // send response header with the new range 206 for partial content
            'Content-Range': 'bytes ' + newStart + '-' + newEnd + '/' + total,
            'Accept-Ranges': 'bytes', 'Content-Length': (newEnd - newStart)+1,
            'Content-Type': 'audio/mp3'
        });
        readStream.pipe(res);
     } else { // if range.header = 0 
        res.writeHead(200, { 'Content-Length': total, 'Content-Type': 'audio/mpeg' });
        fs.createReadStream(path).pipe(res);
     }
});



/*Takes info from the user req to create a sqlite query that will give the
user a music play list of all matching songs in the database
*/
 app.post('/search',function(req,res){
  var message = ''; 
  var source = ``; // no music decided yet
  console.log(req.body.search);
  if(req.body.search !== ''){ // if search is not empty
  var statment = db.prepare(`SELECT * FROM Song WHERE (song_name LIKE ? or song_artist LIKE ? or song_album LIKE ?)`); // wildcard search
      statment.all('%' + req.body.search.split(' ').join('%') + '%' ,'%' + req.body.search.split(' ').join('%') +'%', '%' + req.body.search.split(' ').join('%') + '%',function(err,rows){
      
    console.log(rows);
    if(rows === undefined || rows.length === 0 ){ // if no songs match search
      console.log("Search Not Found");
      message = "<p> Sorry we couldn't find the song you were looking for. Make sure that there are no spaces after the name. </p>";
      res.render('PlayList',{message, source});
     }
    else{
      for(var i in rows){ // if songs are found generate playlist 
         source = source + `<li> <div>${rows[i].song_artist} - [${rows[i].song_name}] </div>` + 
           `<audio id="music" controls preload = none>` + 
           `<source src= '${rows[i].file_path}'>` +  
           `</audio>  </li>`
      }
       res.render('PlayList',{source, message}) // send the playlist with music sources
     }
    });
  }
   else{ // nothing was searched for
    res.render('PlayList',{source, message})
   }
 });
      
/*send upload interface for user
*/
 app.get('/upload',function(req,res){
   var message = ""; // no message since user has not taken action
   res.render('Upload',{message});
 });

/*
 * Will handle all user file uploads along with taking the users label info
 * to insert the new song into the database as labeled by the user
 */
app.post('/upload', function(req, res){
  console.log("Uploading");
  var message = "You forgot to add the file"; // assume no file is attached
  var form = new formidable.IncomingForm(); // handle form information
  form.parse(req); 
  var songInfo = []; // array of song info 
  var i = 0;
    form.on('field',function(name,value){ // store user labels in songInfo
      songInfo[i] = value;
      i++;
    });
    if(songInfo[0] !==''){ // if song name is labeled 
      form.on('fileBegin', function (name, file){ // start on file stream
        if(file.type === 'audio/mp3'){ // if user file is mp3
              if(songInfo[1] === '') // fill in artist if empty
                songInfo[1] = "Unknown Artist";
              if(songInfo[2] === '') // fill in album if empty
                songInfo[2] = "Unkown Album";
              var hash = crypto.createHash('md5').update(file.name).digest('hex') + '.mp3' ; // rename file to prevent collision
              file.path = __dirname + '/media/' + hash; // store song file on sever
              var statment = db.prepare(`INSERT INTO Song (song_name,song_artist,song_album,file_path) VALUES (?,?,?,?)`);
              statment.run(songInfo[0],songInfo[1],songInfo[2],`media/${hash}`); // insert into sql database for searching
              message ='Upload Completed!';
      }
      else{ // file is not mp3
        message = "We only accept mp3 files";
      }
     });
    }
  if(songInfo[0]===''){ // song name not labeled
     message = "alert(You must have a song name!)";
  }     
  form.on('file', function (name, file){ // after file upload complete 
          console.log('Uploaded ' + file.name);
          res.render('home page',{message});
          res.end();
    });
});

   