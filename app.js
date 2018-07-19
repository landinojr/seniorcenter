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
const Movie = require('./models/movie');  
const Book = require('./models/Book');
const async = require('async');
const reload = require ('reload')
//VOICE CLIENT
//var SinchClient = require('sinch-rtc');

//Controllers
//const mediaController = require('./controllers/mediaController');
//Suggestion keywords
var bookKeywords = ["fiction","cooking","survival","physics","art"];
var movieKeywords = ["IT","Touching the void","The hustler"];
var readBooks = [];
var watchedMovies = [];
var metaData = new Map();
//Session state
var auth2;
var signedIn = false;
const function_list = [];
var searchData;
const passport = require('passport')
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
                    });

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
    lang: 'en'
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

function fill_with_media(numPerRow){
    for (let keyword of bookKeywords){
    if (!metaData.has(keyword)){
      function_list.push(function(callback){
      //console.log(function_list.length);
      //console.log(keyword);
      books.search(keyword,options_for_key_search("subject",0,numPerRow), function(err, data) {
      if(err){
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
  bookKeywords.splice(0, 0, keyword);
}

function remove_keyword(keyword){
  console.log(keyword);
  //test if it is a keyword first then splice
  if (metaData.has(keyword)){
    metaData.delete(keyword);
  }
  console.log(metaData.keys())
  bookKeywords.splice(bookKeywords.indexOf(keyword), 1);
  console.log(bookKeywords);
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

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const formsRouter = require('./routes/forms');

var app = express();

const mongoose = require( 'mongoose' );
// here is where we connect to the database!
mongoose.connect( 'mongodb://localhost:27017/seniorcenter' );
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log("we are connected!")
});

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

//app.use(express.static(path.join(__dirname, 'public')));

app.use('/users', usersRouter);
app.use('/forms', formsRouter);

//check login status
app.use(function(req, res, next){
  if(req.isAuthenticated()){
    res.locals.isLoggedIn = true;
  }
  next();
})

app.get('/auth/google', passport.authenticate('google', { scope : ['profile', 'email'] }));

app.get('/auth/google/callback', passport.authenticate('google', {
  successRedirect: '/',
  failureRedirect: '/'
}))

app.get('/profile',(req,res)=> {
  res.render('profile');
})

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
})

app.post('/home',(req,res)=> {
  console.log(req.body);
  //TOPIC RELATED STUFF
  if (req.body.searchTopic){
    if (!metaData.has(req.body.searchTopic)) add_keyword(req.body.searchTopic);
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

app.get('/home',(req,res)=> {
  //console.log(req.body);
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
})

app.use('/', function(req, res, next) {
  console.log("in / controller");
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
