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

var sampleKeywords = ["fiction","cooking","science","travel","art"];
var $ = require('jquery');
//Session state
const function_list = [];
const passport = require('passport');


var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

// load up the user model
var User  = require('./models/User');

// load the auth variables
var configAuth = require('./config/auth');

//Passport authentication
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
                //console.log(user.metaData);
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
                      profileimg: profile._json.image.url,
                      keywordsToSearch: sampleKeywords,
                      metaData: {},
                      friends: {},
                      friendReqs: {}
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

function is_media(keyword, user){
  if(user.metaData.has(keyword.toLowerCase())){
    return true;
  }
  return user.bookKeywords.includes(keyword);
}


function is_new_media(user){
  return (!user.keywordsToSearch.length == 0);
  }

function fill_with_media(numPerRow,user,callback){
    while (is_new_media(user)){
      let keyword = user.keywordsToSearch.pop();
      console.log("K " + keyword);
      user.save();
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
              user.bookKeywords.splice(0, 0, keyword);
              user.metaData.set(keyword, data);
            }else{
              remove_keyword(keyword,user);
            }
          callback(err, data);
          }else{
            remove_keyword(keyword,user);
            console.log("No results for " + keyword);
          }
        }
      });
    })
  }
  async.parallel(function_list, function(err){
      if(err){
        console.log(err);
      } else {
        console.log(user.metaData.keys());
        return user.save(callback);
      }
    })
}

function switch_keywords(keyX,keyY,user,callback){
  console.log(user);
  var x = user.bookKeywords.indexOf(keyX);
  var y = user.bookKeywords.indexOf(keyY);
  console.log(x + " " + y)
  var temp = user.bookKeywords[y];
  user.bookKeywords[y] = user.bookKeywords[x];
  user.bookKeywords[x] = temp;
  return user.save(callback);
}

function add_keyword(keyword,user,callback){
  user.keywordsToSearch.push(keyword);
  return user.save(callback);
}

function remove_keyword(keyword,user,callback){
  console.log(keyword);
  //test if it is a keyword first then splice
  if (is_media(keyword,user)){
    user.metaData.delete(keyword);
    //console.log(user.metaData.get(keyword));
  }
  user.bookKeywords.splice(user.bookKeywords.indexOf(keyword), 1);
  return user.save(callback);
}

//To string functions
function movie_to_string(movieOBJ){
  return movieOBJ.Title + " released " + movieOBJ.Year + ", directed by " + movieOBJ.Director;
}

function book_to_string(bookOBJ){
  return bookOBJ.title + " by " + bookOBJ.authors + ", published by " + bookOBJ.publisher;
}

//Create paramters to be used by omdb api
function general_omdb_params(text, type){
  if (type === "TV Show"){
    type = "series";
  }
  return {
    apiKey: 'f7cb9dc5',
    type: type.toLowerCase(),
    query: text
  }
}

//Create api key object
function get_id_params(id, type){
  return {
    apiKey: 'f7cb9dc5',
    type: type,
    id: id
  }
}


//Search for user
function search_users(searchName, callback){
  var nameArr = searchName.split(" ");
  return User.find({$or: [{firstname: {$in: nameArr}}, {lastname: {$in: nameArr}}]}, callback);
}

//Find user who has seen movie
function find_movie_friend(currentIndex, searchMovie, callback){
  if (currentIndex != "movieIndex"){
    userCollection.dropIndex("bookIndex");
    userCollection.createIndex({watchedMovieTitles: 'text'}, {name: 'movieIndex'});
  }
  User.find({$text: {$search: searchMovie}}, callback).limit(10);
}

//Find user who has read a book
function find_book_friend(currentIndex, searchBook, callback){
  if (currentIndex != "bookIndex"){
    userCollection.dropIndex("movieIndex");
    userCollection.createIndex({readBookTitles: 'text'}, {name: 'bookIndex'});
  }
  User.find({$text: {$search: searchBook}}, callback).limit(10);
}

//Create friend object
function create_friend_from_user(user){
  return {
    name: user.googlename,
    profileurl: user.profileimg,
    id: user.googleid,
    phone: user.phoneNumber
  };
}

var app = express();
//const helloDFController = require('./controllers/helloDFController');

const mongoose = require( 'mongoose' );
const mongoDB = process.env.MONGO_URI || 'mongodb://localhost:27017/seniorcenter';
// here is where we connect to the database!
mongoose.connect( mongoDB );
const db = mongoose.connection;
const userCollection = db.collection('users');
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

//Get Hicket Help



//check login status
app.use(function(req, res, next){
  if(req.isAuthenticated()){
    res.locals.isLoggedIn = true;
    User.findOne({googleid: req.user.googleid}, function(err, user) {
        if(!err){
         res.locals.isLoggedIn = true;
         res.locals.profileurl = user.profileimg;
         //res.locals.testUser = user;
         //console.dir(res.locals);
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
      User.findOne({googleid: req.user.googleid}, function(err, user) {
        if(!err){
         res.render('profile', {user: user});
        }
      });
  }
})

app.get('/userProfile/:id',(req,res)=> {
  if(req.isAuthenticated()){
      User.findOne({googleid: req.params.id}, function(err, user) {
        if(!err){
         res.render('userProfile', {user: user});
        }
      });
  }
})

app.post('/profile/addNumber',(req,res)=> {
  if(req.isAuthenticated()){
      User.findOne({googleid: req.user.googleid}, function(err, user) {
        if(!err){
          user.phoneNumber = req.body.numberInput;
          user.save(function(err, results){
            if (!err) res.render('profile', {user: user});
          });
        }
      });
  }
})

//Update email
app.post('/profile/addEmail',(req,res)=> {
  if(req.isAuthenticated()){
      User.findOne({googleid: req.user.googleid}, function(err, user) {
        if(!err){
          user.emailAddress = req.body.emailInput;
          user.save(function(err, results){
            if (!err) res.render('profile', {user: user});
          });
        }
      });
  }
})

//Send friend request
app.post('/friends/addFriend',(req,res)=> {
  var userAdded = JSON.parse(req.body.userAdded);
  if(req.isAuthenticated()){
      User.findOne({googleid: req.user.googleid}, function(err, user) {
        if(!err){
          var friendReq = {name:user.googlename, id:user.googleid};
          User.findOne({googleid: userAdded.googleid}, function(err, userOther){
             userOther.friendReqs.set(user.googleid,friendReq);
             userOther.save();
          });
          user.save(function(err, results){
            res.render('friends', {user: results});
          });
        }
      });
  }
})

//Delete friend
app.post('/friends/removeFriend',(req,res)=> {
  if(req.isAuthenticated()){
      User.findOne({googleid: req.user.googleid}, function(err, user) {
        if(!err){
              User.findOne({googleid: req.body.friendRemove}, function(err, userOther){
                user.friends.delete(req.body.friendRemove);
                userOther.friends.delete(user.googleid);
                userOther.save();
                user.save(function(err, results){
                  console.log(results.friends);
                  res.render('profile', {user: results});
                });
              })
        }
      });
  }
})

//Add or ignore friend request
app.post('/friends/acceptReject',(req,res)=> {
  var reqStatus = JSON.parse(req.body.FRstatus);
  if(req.isAuthenticated()){
      User.findOne({googleid: req.user.googleid}, function(err, user) {
        if(!err){
          console.log(reqStatus[0]);
          if (reqStatus[0] === "accept"){
              User.findOne({googleid: reqStatus[1]}, function(err, userOther){
                console.log("IN STATUS");
                user.friends.set(userOther.googleid, create_friend_from_user(userOther));
                userOther.friends.set(user.googleid, create_friend_from_user(user));
                userOther.save();
                user.friendReqs.delete(reqStatus[1]);
                user.save(function(err, results){
                  console.log(results.friends);
                  res.render('friends', {user: results});
                });
              })
          }else{
            user.friendReqs.delete(reqStatus[1]);
            user.save(function(err, results){
              console.log(results.friends);
              res.render('friends', {user: results});
          });
          }
        }
      });
  }
})

//Friends page
app.get('/friends',(req,res)=> {
  if(req.isAuthenticated()){
      User.findOne({googleid: req.user.googleid}, function(err, user) {
        if(!err){
         res.render('friends', {user: user});
        }
      });
  }
})

//Connect page
app.get('/connect',(req,res)=> {
  if(req.isAuthenticated()){
      User.findOne({googleid: req.user.googleid}, function(err, user) {
        if(!err){
         res.render('connect', {user: user, connectPhrase: 'What do we have in common?'});
        }
      });
  }
})

//About page
app.get('/about',(req,res)=> {
  if(req.isAuthenticated()){
      User.findOne({googleid: req.user.googleid}, function(err, user) {
        if(!err){
         res.render('about', {user: user});
        }else{
         res.render('about')
        }
      });
  }else{
    res.render('about')
  }
})

//About page
app.get('/about',(req,res)=> {
  if(req.isAuthenticated()){
      User.findOne({googleid: req.user.googleid}, function(err, user) {
        if(!err){
         res.render('about', {user: user});
        }else{
         res.render('about')
        }
      });
  }else{
    res.render('about')
  }
})

//About page
app.get('/search',(req,res)=> {
  if(req.isAuthenticated()){
      User.findOne({googleid: req.user.googleid}, function(err, user) {
        if(!err){
         res.render('connect', {user: user});
        }
      });
  }
})

//Search for friends 
app.post('/friends/find',(req,res)=> {
  if(req.isAuthenticated()){
      User.findOne({googleid: req.user.googleid}, function(err, user) {
        if(!err){
          search_users(req.body.searchInput, function(err, results){
            if(err){
              res.render('friends', {user: user});
            } else {
              //console.log(results);
              res.render('friends', {user: user, friendsList: results});
            }

          });
        }
      });
  }
})

//Find friend by item
app.post('/friends/finditem',(req,res)=> {
  console.log(req.body);
  if(req.isAuthenticated()){
      User.findOne({googleid: req.user.googleid}, function(err, user) {
        if(!err){
         if (req.body.searchType == "movie"){
          find_movie_friend(user.currentIndex, req.body.searchInput, function(err, results){
            if(err){
              console.log(err);
              res.render('friends', {user: user});
            } else {
              //console.log("RESULTS " + results);
              res.render('friends', {user: user, friendsByItem: results});
            }
          });
         }else{
            find_book_friend(user.currentIndex, req.body.searchInput, function(err, results){
              if(err){
                console.log(err);
                res.render('friends', {user: user});
              } else {
                //console.log("RESULTS " + results);
                res.render('friends', {user: user, friendsByItem: results});
              }
            });
          }
        }
      });
  }
})

//Logout user
app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
})

//Multimedia search
app.post('/home',(req,res) => {
  var user;
  if(req.isAuthenticated()){
    User.findOne({googleid: req.user.googleid}, function(err, foundUser) {
      user = foundUser;

    });
  }
  if (req.body.mediaType && req.body.mediaType === "Book" && req.body.searchInput){
    books.search(req.body.searchInput, options_for_key_search(field_name(req.searchType),0,4), function(err, data) {
      if(data){
        //console.log(data);
        res.render('home', {user: user, bookData: data, searchInput: req.body.searchInput, searchType: req.body.mediaType});
      }
    });
  }else if (req.body.mediaType  && req.body.searchInput){
    omdb.search(general_omdb_params(req.body.searchInput, req.body.mediaType), function(err, data) {
      if(data){
        //console.log(data.Search);
        res.render('home', {user: user, movieData: data.Search, searchInput: req.body.searchInput, searchType: req.body.mediaType});
      }
    })
  }else{
    res.render('home',{user: user});
  }
});


//      DO NOT REMOVE AND UNCOMMENT BEFORE PUSH !!!!
app.post('/hook', helloDFController.respondToDF)

//Home page
app.get('/home',(req,res)=> {
  if (!req.user){
    res.render('about');
  }else{
    User.findOne({googleid: req.user.googleid}, function(err, user) {
        if(!err){
          res.render('home', {user: user});
        }else{
          res.render('about');
        }
      });
  }
})

//Adding new movie
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
        User.findOne({googleid: req.user.googleid}, function(err, user) {
          //console.log(new_data);
          if (!(user.movieIds.includes(data.movieid))){
            user.watchedMovies.push(new_data);
            user.movieIds.push(req.params.movieid);
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

//Book page
app.get('/home/:id',(req,res)=> {
  books.lookup(req.params.id, function(err, data) {
        res.render('media',{volume: data});
    });
})

//Movie page
app.get('/home/movie/:movieid',(req,res)=> {
  console.log(req.params);
  omdb.get(get_id_params(req.params.movieid,"movie"), function(err, data){
    //console.log(data);
    res.render('mediaIMDB',{movieData: data});
   });
});

//Redirect to home page
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
