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

function sampleData(){
  var sampleMap = new Map();
  for (index in sampleKeywords){
    let keyword = sampleKeywords[index];
    function_list.push(function(callback){
      books.search(keyword,options_for_key_search("subject",0,5), function(err, data) {
        function_list.pop();
        sampleMap.set(keyword,data);
        callback(err, data);
    });
    })
  }
  async.parallel(function_list, function(err){
    if(err){
      console.log(err);
    } else {
      console.log("RETURNED " + sampleMap);
      sampleData = sampleMap;
    }
  })
}

var sampleData;
sampleData();

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

//NEEDS WORK
function find_common_media(user, callback){
  var commonMedia = [];
  for(let friend in user.friends.values()){
      User.findOne({googleid: friend.id}, function(err, results){
        var mediaObject = {
          movies: common_movies(user.watchedMovies, results.watchedMovies),
          books: common_books(user.readBooks, results.readBooks),
          usersMedia: [friend.name,friend.id]
        }
        if (mediaObject.movies.length > 0 || mediaObject.books.length > 0){
          commonMedia.push(mediaObject);
        }
      });
    }
  return commonMedia;
}

function common_movies(movieList1, movieList2){

}

function common_books(bookList1, bookList2){
  
}

//OLD repalce selfID
function find_friends(selfID){
  //REPLACE
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
  return User.find({$or: [{firstname: {$in: nameArr}}, {lastname: {$in: nameArr}}]}, callback);
}

//SEPERATE BUT EQUAL SEARCH F(N)'s
function find_movie_friend(currentIndex, searchMovie, callback){
  if (currentIndex != "movieIndex"){
    userCollection.dropIndex("bookIndex");
    userCollection.createIndex({watchedMovieTitles: 'text'}, {name: 'movieIndex'});
  }
  User.find({$text: {$search: searchMovie}}, callback).limit(10);
}

function find_book_friend(currentIndex, searchBook, callback){
  if (currentIndex != "bookIndex"){
    userCollection.dropIndex("movieIndex");
    userCollection.createIndex({readBookTitles: 'text'}, {name: 'bookIndex'});
  }
  User.find({$text: {$search: searchBook}}, callback).limit(10);
}

function notification(type){

}

function create_friend_from_user(user){
  return {
    name: user.googlename,
    profileurl: user.profileimg,
    id: user.googleid,
    phone: user.phoneNumber
  };
}

var app = express();
const helloDFController = require('./controllers/helloDFController');

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

app.get('/friends',(req,res)=> {
  if(req.isAuthenticated()){
      User.findOne({googleid: req.user.googleid}, function(err, user) {
        if(!err){
         res.render('friends', {user: user});
        }
      });
  }
})

app.post('/friends/find',(req,res)=> {
  if(req.isAuthenticated()){
      User.findOne({googleid: req.user.googleid}, function(err, user) {
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
      User.findOne({googleid: req.user.googleid}, function(err, user) {
        if(!err){
         res.render('friends', {user: user});
        }
      });
  }
})

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

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
})

app.post('/home',(req,res)=> {
  var dataToUse;
  var keywordsToUse;
  var bookIds;
  if (req.user){
    User.findOne({googleid: req.user.googleid}, function(err, user) {
        if(!err){
          var userForMedia = user;
          dataToUse = user.metaData;
          keywordsToUse = user.bookKeywords;
          bookIds = user.bookIds;
          if (req.body.searchTopic){
            if (!is_media(req.body.searchTopic, user)) add_keyword(req.body.searchTopic,user, function(err, updatedUser){
              userForMedia = updatedUser;
              console.log(userForMedia.keywordsToSearch);
            });
          }else if(req.body.topicSwitch){
            var topics = JSON.parse(req.body.topicSwitch);
            switch_keywords(topics[0], topics[1], user, function(err, updatedUser){
              res.render('home', {readBookIds: user.bookIds, keywordsOrder: updatedUser.bookKeywords, books: updatedUser.metaData, title: 'SeniorClub'}); 
            });
          }else if (req.body.topicDelete){
            remove_keyword(req.body.topicDelete, user, function(err, updatedUser){
              res.render('home', {readBookIds: user.bookIds, keywordsOrder: updatedUser.bookKeywords, books: updatedUser.metaData, title: 'SeniorClub'}); 
            });
          } 
          console.log(userForMedia.keywordsToSearch);
          if(is_new_media(userForMedia)){
            fill_with_media(5,userForMedia, function(err, resolvedUser){
              if (!err){
                res.render('home', {readBookIds: user.bookIds, keywordsOrder: resolvedUser.bookKeywords, books: resolvedUser.metaData, title: 'SeniorClub'});
              }
            });
          }
        }
      });
  }
  //SEARCH RELATED STUFF
  if (req.body.mediaType && req.body.mediaType === "Book"){
    books.search(req.body.searchInput,options_for_key_search(field_name(req.searchType),0,4), function(err, data) {
      if (data){
        res.render('home', {readBookIds: bookIds, keywordsOrder: keywordsToUse, searchType: req.body.mediaType, searchInput: req.body.searchInput, searchData: data, books: dataToUse, title: 'SeniorClub'});
      }else{
        res.render('home', {readBookIds: bookIds, keywordsOrder: keywordsToUse, searchType: req.body.mediaType, searchInput: req.body.searchInput, books: dataToUse, title: 'SeniorClub'});
      }
    });
  }else if (req.body.mediaType){
    omdb.search(general_omdb_params(req.body.searchInput, req.body.mediaType), function(err, data) {
      if(err){
        console.log(err);
        res.render('home', {readBookIds: bookIds, keywordsOrder: keywordsToUse, searchType: req.body.mediaType, searchInput: req.body.searchInput, books: dataToUse, title: 'SeniorClub'});
      } else {
        console.log(data.Search);
        res.render('home', {readBookIds: bookIds, keywordsOrder: keywordsToUse, searchType: req.body.mediaType, searchInput: req.body.searchInput, movieData: data.Search, books: dataToUse  , title: 'SeniorClub'});
      }
    })
  }else{
    if(req.user){
      console.log("SHOULD NOT BE HERE");
    }else{
      res.render('home', { keywordsOrder: sampleKeywords, books: sampleData, title: 'SeniorClub'});
    }
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
      User.findOne({googleid: req.user.googleid}, function(err, user) {
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

app.post('/hook', helloDFController.respondToDF)

app.get('/home',(req,res)=> {
  if (!req.user){
    res.render('home', {keywordsOrder: sampleKeywords, books: sampleData, title: 'SeniorClub'});
  }else{
    User.findOne({googleid: req.user.googleid}, function(err, user) {
        if(!err){
          if(is_new_media(user)){
            fill_with_media(5,user, function(err, resolvedUser){
              //console.log(resolvedUser.metaData.get("fiction")[0].title);
              res.render('home', {readBookIds: user.bookIds, keywordsOrder: resolvedUser.bookKeywords, books: resolvedUser.metaData, title: 'SeniorClub'});
            });
          }else{
            //console.log(user.metaData.get("fiction")[0].title);
            res.render('home', {readBookIds: user.bookIds, keywordsOrder: user.bookKeywords, books: user.metaData, title: 'SeniorClub'});
          }
        }
      });
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
        User.findOne({googleid: req.user.googleid}, function(err, user) {
          //console.log(new_data);
          if (!(data.moveid in user.movieIds)){
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


app.get('/home/:id',(req,res)=> {
  books.lookup(req.params.id, function(err, data) {
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
