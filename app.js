//Global variables
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var readline = require('readline-sync');
var omdb = require('omdb-client');
const session = require("express-session");
const bodyParser = require("body-parser");
var books = require('google-books-search');
//Models
const async = require('async');
const reload = require ('reload')
//VOICE CLIENT
//var SinchClient = require('sinch-rtc');

//Controllers
//const mediaController = require('./controllers/mediaController');
//Suggestion keywords
var bookKeywords = [];
var movieKeywords = ["IT","Touching the void","The hustler"];
var keywordsToSearch = ["fiction","cooking","survival","physics","art"];
var metaData = new Map();
var $ = require('jQuery');
var commonMovies = new Map();
var commonBooks = new Map();
//Session state
var auth2;
var signedIn = false;
const function_list = [];
var searchData;
var id_of_current_user;
const passport = require('passport');
//const configPassport = require('./config/passport')
//configPassport.test(passport);

var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

// load up the user model
var User  = require('./models/user');

// load the auth variables
var configAuth = require('./config/auth');

passport.use(new GoogleStrategy({

    clientID        : configAuth.googleAuth.clientID,
    clientSecret    : configAuth.googleAuth.clientSecret,
    callbackURL     : configAuth.googleAuth.callbackURL,

},

//AUTHENTICATION
function(token, refreshToken, profile, done) {

    // make the code asynchronous
    // User.findOne won't fire until we have all our data back from Google
    process.nextTick(function() {
       console.log("looking for userid")
        // try to find the user based on their google id
        User.findOne({ 'googleid' : profile.id }, function(err, user) {
            if (err)
                return done(err);
            if (user) {
                console.log('user found: ' + user)
                // if a user is found, log them in
                id_of_current_user = new ObjectID(user._id);
                return done(null, user);
            } else {
                console.log('no user found - creating new user')
                console.dir(profile)
                // if the user isnt in our database, create a new user
                var newUser
                 = new User(
                     {googleid: profile.id,
                      googletoken: token,
                      googlename:profile.displayName,
                      googleemail:profile.emails[0].value,
                      firstname: profile.name.givenName,
                      lastname: profile.name.familyName,
                      profileimg: profile._json.image.url
                    });
                id_of_current_user = new ObjectID(newUser._id);
                // save the user
                newUser.save(function(err) {
                  console.log("saving the new user")
                    if (err)
                        throw err;
                    return done(null, newUser);
                }); 
            }
        });
    });
}));

// used to serialize the user for the session
passport.serializeUser(function(user, done) {
  console.log('serializing user ' + user)
    done(null, user.id);
});

// used to deserialize the user
passport.deserializeUser(function(id, done) {
  console.log('in deserializeUser')
    User.findById(id, function(err, user) {
        done(err, user);
    });
});
//Database + API functions
function options_for_key_search(searchField,shift,max){
  //declare and return functions 
  var options = {
    //key: "AIzaSyDfYJlzqCDNTa7ScwfTGm3gnxFkRFO4JBA",
    field: searchField,
    limit: max,
    offset: shift,
    type: 'books', 
    order: 'relevance',
    lang: 'en',
    country: 'US'
  }
  return options;
}

function random_int(max){
  return Math.floor(Math.random()*max);
}

function create_omdb_params(title){
	//declare and return functions 
	var params = {
    	apiKey: 'f7cb9dc5',
    	title: title
	}
	return params;
}

/*GOOGLE BOOKS API*/
//var book_info = readline.question("Search for a book: ");

function field_name(input){
switch(input){
  case "Title":
    return "intitle";
    break;
  case "Topic":
    return "subject"
    break;
  case "Creator":
    return "author";
    break;
  default:
    return "intitle";
    break;
  }
}

function is_media(keyword){
  //return (keyword in bookKeywords);
  console.log(bookKeywords)
  return (bookKeywords.indexOf(keyword.toLowerCase()) > -1);
}


function is_new_media(){
  return (!keywordsToSearch.length == 0);
  }

function fill_with_media(numPerRow){
  while (is_new_media()){
      let keyword = keywordsToSearch.pop();
      bookKeywords.splice(0, 0, keyword);
      console.log(keyword + keywordsToSearch.length);
      function_list.push(function(callback){
      books.search(keyword,options_for_key_search("subject",0,numPerRow), function(err, data) {
        function_list.pop();
      if(err){
        console.log(keyword + " ERROR" + data);
        callback(err);
      } else {
        if (data) {
          console.log("Subject search on " + keyword + " got " + data.length + "/" + numPerRow + " results");
          if (data.length > 0){
              metaData.set(keyword,data);
          }else{
              remove_keyword(keyword);
          }
          callback(err, data);
        }else{
          remove_keyword(keyword);
          console.log("No results for " + keyword);
        }
      }
    });
    })
  }
}

function switch_keywords(keyX,keyY){
  var x = bookKeywords.indexOf(keyX);
  var y = bookKeywords.indexOf(keyY);
  console.log(x + " " + y)
  var temp = bookKeywords[y];
  bookKeywords[y] = bookKeywords[x];
  bookKeywords[x] = temp;
}

function add_keyword(keyword){
  //test if it has results or already exists first
  keywordsToSearch.push(keyword);
  //bookKeywords.splice(0, 0, keyword);
}

function remove_keyword(keyword){
  console.log(keyword);
  //test if it is a keyword first then splice
  if (is_media(keyword)){
    metaData.delete(keyword);
  }
  console.log(metaData.keys())
  bookKeywords.splice(bookKeywords.indexOf(keyword), 1);
  console.log(bookKeywords);
}

function movie_to_string(movieOBJ){
  return movieOBJ.Title + " released " + movieOBJ.Year + ", directed by " + movieOBJ.Director;
}

function book_to_string(bookOBJ){
  return bookOBJ.title + " by " + bookOBJ.authors + ", published by " + bookOBJ.publisher;
}

function general_omdb_params(text, type){
  if (type === "TV Show"){
    type = "series";
  }
  console.log(type);
  return {
    apiKey: 'f7cb9dc5',
    type: type.toLowerCase(),
    query: text
  }
}

function get_id_params(id, type){
  return {
    apiKey: 'f7cb9dc5',
    type: type,
    id: id
  }
}

//THEM ASYNC/AWAIT FUNCTIONS
//NEEDS WORK
async function find_common_media(selfID){
  User.findById(selfID, function(err, user) {
    if(!err){
     user.friendIds.forEach(function(friendID){
      User.findById(friendID, function(err, otherUser) {
        if(!err){
          user.movieIds.forEach(function(currID){
            if (otherUser.movieIds.includes(currID)){
              if (commonMovies.has(currID)){
                commonMovies.get(currID).push(otherUser);
              }else{
                commonMovies.set(currID, [otherUser]);
              }
            }
          });
          user.bookIds.forEach(function(currID){
            if (otherUser.bookIds.includes(currID)){
              if (commonBooks.has(currID)){
                commonBooks.get(currID).push(otherUser);
              }else{
                commonBooks.set(currID, [otherUser]);
              }
            }
          });
        }
      });
     });
    }
  });
}

function find_friends(selfID){
  User.findById(id_of_current_user, function(err, user) {
    if(!err){
      User.find({bookIds: {$in: user.bookIds}}, function(err, res){
        console.log(res);
      });
      User.find({movieIds: {$in: user.movieIds}}, function(err, res){
        console.log(res);
      });
    }
  });
}

function search_users(searchName, callback){
  var nameArr = searchName.split(" ");
  User.findById(id_of_current_user, function(err, user) {
    if(!err){
      User.find({$or: [{firstname: {$in: nameArr}}, {lastname: {$in: nameArr}}]}, callback);
    }
  });
}

async function add_friend(selfID, friendID){
  User.findById(selfID, function(err, user) {
    if(!err){
      user.friends.push(friendID);
      user.save(function (err, updatedUser) {
          if (!err) console.log(updatedUser.googlename + " added as friend!");
      });
    }
  });
}

function find_movie_friend(searchMovie, callback){
  //User.schema.index({watchedMovieTitles : 'text'});
  User.findById(id_of_current_user, function(err, user) {
    if(!err){
      User.find({$text: {$search: searchMovie}}, callback).limit(10);
    }
  });
}

function find_book_friend(searchBook, callback){
  //User.schema.index({readBookTitles : 'text'});
  User.findById(id_of_current_user, function(err, user) {
    if(!err){
      User.find({$text: {$search: searchBook}}, callback).limit(10);
    }
  });
}

var app = express();
const helloDFController = require('./controllers/helloDFController');

const mongoose = require( 'mongoose' );
const mongoDB = process.env.MONGO_URI || 'mongodb://localhost:27017/seniorcenter';
// here is where we connect to the database!
mongoose.connect( mongoDB );
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log("we are connected!");
});

//console.log(User.find());
var ObjectID = require('mongodb').ObjectID;
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
//middleware to process the req object and make it more useful!
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({ secret: 'zzbbyanana' }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(passport.initialize());
app.use(passport.session());

//check login status
app.use(function(req, res, next){
  if(req.isAuthenticated()){
    res.locals.isLoggedIn = true;
    User.findById(id_of_current_user, function(err, user) {
        if(!err){
         res.locals.isLoggedIn = true;
         res.locals.profileurl = user.profileimg;
        }
        next();
      });
  }else{
      next();
  }
})


app.get('/auth/google', passport.authenticate('google', { scope : ['profile', 'email'] }));

app.get('/auth/google/callback', passport.authenticate('google', {
  successRedirect: '/',
  failureRedirect: '/'
}))

app.get('/profile',(req,res)=> {
  if(req.isAuthenticated()){
      User.findById(id_of_current_user, function(err, user) {
        if(!err){
         res.render('profile', {user: user});
        }
      });
  }
})

app.get('/friends',(req,res)=> {
  if(req.isAuthenticated()){
      User.findById(id_of_current_user, function(err, user) {
        if(!err){
         res.render('friends', {user: user});
        }
      });
  }
})

app.post('/friends/find',(req,res)=> {
  if(req.isAuthenticated()){
      User.findById(id_of_current_user, async function(err, user) {
        if(!err){
          search_users(req.body.searchInput, function(err, results){
            if(err){
              res.render('friends', {user: user});
            } else {
              console.log(results);
              res.render('friends', {user: user, friendsList: results});
            }

          });
        }
      });
  }
})

app.post('/friends/users/find',(req,res)=> {
  if(req.isAuthenticated()){
      User.findById(id_of_current_user, function(err, user) {
        if(!err){
         res.render('friends', {user: user});
        }
      });
  }
})

app.post('/friends/finditem',(req,res)=> {
  console.log(req.body);
  if(req.isAuthenticated()){
      User.findById(id_of_current_user, function(err, user) {
        if(!err){
         if (req.body.searchType == "movie"){
          find_movie_friend(req.body.searchInput, function(err, results){
            if(err){
              console.log(err);
              res.render('friends', {user: user});
            } else {
              console.log("RESULTS " + results);
              res.render('friends', {user: user, friendsByItem: results});
            }
          });
         }else{
            find_book_friend(req.body.searchInput, function(err, results){
              if(err){
                console.log(err);
                res.render('friends', {user: user});
              } else {
                console.log("RESULTS " + results);
                res.render('friends', {user: user, friendsByItem: results});
              }
            });
          }
        }
      });
  }
})

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
})

app.post('/home',(req,res)=> {
  console.log(req.body);
  //TOPIC RELATED STUFF
  if (req.body.searchTopic){
    if (!is_media(req.body.searchTopic)) add_keyword(req.body.searchTopic);
  }
  if (req.body.topicSwitch){
    var topics = JSON.parse(req.body.topicSwitch);
    //console.log(topics);
    switch_keywords(topics[0], topics[1]);
  }
  if (req.body.topicDelete){
    remove_keyword(req.body.topicDelete);
  }
  fill_with_media(5);
  //SEARCH RELATED STUFF
  if (req.body.mediaType && req.body.mediaType === "Book"){
    books.search(req.body.searchInput,options_for_key_search(field_name(req.searchType),0,4), function(err, data) {
      if (data){
        //console.log(data[0].title)
        res.render('home', {keywordsOrder: bookKeywords, searchType: req.body.mediaType, searchInput: req.body.searchInput, searchData: data, books: metaData, title: 'SeniorClub'});
      }else{
        res.render('home', {keywordsOrder: bookKeywords, searchType: req.body.mediaType, searchInput: req.body.searchInput, books: metaData, title: 'SeniorClub'});
      }
    });
  }else if (req.body.mediaType){
    omdb.search(general_omdb_params(req.body.searchInput, req.body.mediaType), function(err, data) {
      if(err){
        console.log(err);
        res.render('home', {keywordsOrder: bookKeywords, searchType: req.body.mediaType, searchInput: req.body.searchInput, books: metaData, title: 'SeniorClub'});
      } else {
        console.log(data.Search);
        res.render('home', {keywordsOrder: bookKeywords, searchType: req.body.mediaType, searchInput: req.body.searchInput, movieData: data.Search, books: metaData, title: 'SeniorClub'});
      }
    })
  }else{
  //NON SPECIFIC RENDERER
  async.parallel(function_list, function(err){
    if(err){
      console.log(err);
    } else {
      res.render('home', {keywordsOrder: bookKeywords, books: metaData, title: 'SeniorClub'});
    }
  })
  }
})


app.post('/home/:id',(req,res)=> {
  books.lookup(req.params.id, function(err, data) {
      if (data){
        //console.log(data);
        var new_data = {
          name: book_to_string(data),
          url: data.link,
          poster: data.thumbnail,
          id: data.id
        }
      //console.log(id_of_current_user);
      User.findById(id_of_current_user, function(err, user) {
        if (!(data.id in user.bookIds)){
          user.readBooks.push(new_data);
          user.bookIds.push(data.id);
          user.readBookTitles.push(data.title);
          user.save(function (err, updatedUser) {
          console.log(updatedUser);
        });
        }
      });
      res.render('media',{volume: data});
      }
    });
})

app.get('/home',(req,res)=> {
  //console.log(req.body);
  if(is_new_media()){
      fill_with_media(5);
  async.parallel(function_list, function(err){
    if(err){
      console.log(err);
    } else {
      //console.log(metaData.keys());
      //console.log(bookKeywords);
      res.render('home', {keywordsOrder: bookKeywords, books: metaData, title: 'SeniorClub'});
    }
  })
  }else{
    res.render('home', {keywordsOrder: bookKeywords, books: metaData, title: 'SeniorClub'});
  }
})

app.post('/home/movie/:movieid',(req,res)=> {
  omdb.get(get_id_params(req.params.movieid, "movie"), function(err, data) {
      if (data){
        //console.log(data);
        var new_data = {
          name: movie_to_string(data),
          url: data.Website,
          poster: data.Poster,
          id: req.params.movieid
        }
        console.log(id_of_current_user);
        User.findById(id_of_current_user, function(err, user) {
          //console.log(new_data);
          if (!(data.moveid in user.movieIds)){
            user.watchedMovies.push(new_data);
            user.movieIds.push(data.movieid);
            user.watchedMovieTitles.push(data.Title);
            user.save(function (err, updatedUser) {
            console.log(updatedUser);
          });
          }
        });
        res.render('mediaIMDB',{movieData: data});
      }
    });
})

app.get('/home',(req,res)=> {
  //console.log(req.body);
  if(is_new_media()){
      fill_with_media(5);
  async.parallel(function_list, function(err){
    if(err){
      console.log(err);
    } else {
      console.log(metaData.keys());
      console.log(bookKeywords);
      res.render('home', {keywordsOrder: bookKeywords, books: metaData, title: 'SeniorClub'});
    }
  })
  }else{
    res.render('home', {keywordsOrder: bookKeywords, books: metaData, title: 'SeniorClub'});
  }
})

app.get('/home/:id',(req,res)=> {
  books.lookup(req.params.id, function(err, data) {
        //console.log(data);
        res.render('media',{volume: data});
    });
})

app.get('/home/movie/:movieid',(req,res)=> {
  console.log(req.params);
  omdb.get(get_id_params(req.params.movieid,"movie"), function(err, data){
    console.log(data);
    res.render('mediaIMDB',{movieData: data});
   });
});

app.use('/', function(req, res, next) {
  res.redirect('/home');
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

app.use(bodyParser.json());

module.exports = app;
