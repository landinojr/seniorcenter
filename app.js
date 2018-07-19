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

// here we set up authentication with passport
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

//Controllers
//const mediaController = require('./controllers/mediaController');

//Suggestion keywords
var bookKeywords = ["fiction","cooking","survival","physics","art"];
var movieKeywords = ["IT","Touching the void","The hustler"];
var metaData = new Map();
// //Session state
// var auth2;
// var signedIn = false;
const function_list = [];
var searchData;

// //Google authentication
// var initClient = function() {
//     gapi.load('auth2', function(){
//         auth2 = gapi.auth2.init({
//             client_id: '323237114211-bvkkag3t6ddo9dcvdf7p0laoe99b6kap.apps.googleusercontent.com'
//         });
//         // Attach the click handler to the sign-in button
//         auth2.attachClickHandler('signin-button', {}, onSuccess, onFailure);
//     });
// };
//
// var onSuccess = function(user) {
//     console.log('Signed in as ' + user.getBasicProfile().getName());
//     signedIn = true;
//  };
//
// var onFailure = function(error) {
//     console.log(error);
// };
//
// function signOut() {
//     auth2.signOut().then(function () {
//       console.log('User signed out.');
//     });
//   }

//Database + API functions
function get_posterURL(title){
	var params = create_omdb_params(title);
	omdb.get(params, function(err, data) {
		return data.Poster;
	});
}

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

function display_data(){
	//Does general find and prints out title of each existing element
	Movie.find({},function(err, res){
		for (var e in res){
			//Print title of movie object in database
			console.log(res[e].title);
		}
	});
}

function save_movie_from_data(data){
	//Create new movie object and display in console
	console.log("Saving movie data...");
	var new_movie = new Movie( {
    	movieid: data.imdbID,
  		title: data.Title,
  		year: data.Year,
  		posterurl: data.Poster
  } )
	//Save new movie object and display in console
	new_movie.save(function(err,result){
		console.log(new_movie.title + " data saved!");
	});

}

/*GOOGLE BOOKS API*/
//var book_info = readline.question("Search for a book: ");

function search_book_title(title){
  books.search(title, function(error, data) {
    if ( ! error ) {
        //console.log(data[0]);
        save_book_from_data(data[0])
            } else {
                console.log(error);
            }
    });
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


function save_book_from_data(data){
  //Create new book object and display in console
  console.log("Saving book data...");
  var new_book = new Book( {
      title: data.title,
      authors: data.authors,
      publishedDate: data.publishedDate,
      description: data.description,
      pageCount: data.pageCount,
      posterURL: data.thumbnail,
      link: data.link
  } )
  //Save new movie object and display in console
  new_book.save();
  console.log("Book data saved!");
}

function fill_with_media(numPerRow){
    for (let keyword of bookKeywords){
    if (!metaData.has(keyword)){
      function_list.push(function(callback){
      //console.log(function_list.length);
      //console.log(keyword);
      books.search(keyword,options_for_key_search("subject",0,numPerRow), function(err, data) {
      if (data) console.log("Subject search preformed, got " + data.length + " results");
      if(err){
        callback(err);
      } else {
        callback(err, data);
        metaData.set(keyword,data);
      }
    });
    })
    }
  }
}

function chage_in_keywords(x,y){
  var temp = bookKeywords[y];
  bookKeywords[y] = bookKeywords[x];
  bookKeywords[x] = temp;
}

function add_keyword(keyword){
  //test if it has results or already exists first
  bookKeywords.push(keyword);
}

function remove_keyword(keyword){
  //test if it is a keyword first then splice
  bookKeywords.push(keyword);
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
app.use(session({
  secret: 'zzbbyanana' ,
  resave: false,
  saveUninitialized: true,
}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(passport.initialize());
app.use(passport.session());

//app.use(express.static(path.join(__dirname, 'public')));

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

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
})

// app.get('/login/authorized',
//   passport.authenticate('google', {
//     successRedirect : '/',
//     failureRedirect : '/loginerror'
//   })
// );

// route middleware to make sure a user is logged in
// function signedIn(req, res, next) {
//     console.log("checking to see if they are authenticated!")
//     // if user is authenticated in the session, carry on
//     res.locals.loggedIn = false
//     if (req.isAuthenticated()){
//       console.log("user has been Authenticated")
//       return next();
//     } else {
//       console.log("user has not been authenticated...")
//       res.redirect('/login');
//     }
// }

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/forms', formsRouter);

app.get('/media',(req,res)=> {
	res.render('media');
})

app.get('/findMovie',(req,res)=> {
	res.render('media');
})

app.get('/findBook',(req,res)=> {
  res.render('media');
})

app.post('/home',(req,res)=> {
  console.log(req.body);
  fill_with_media(5);
  if (req.body.mediaType === "Book"){
    books.search(req.body.searchInput,options_for_key_search(field_name(req.searchType),0,4), function(err, data) {
      if (data){
        console.log(data[0].title)
        res.render('home', {keywordsOrder: bookKeywords, searchType: req.body.mediaType, searchInput: req.body.searchInput, searchData: data, books: metaData, title: 'SeniorClub'});
      }else{
        res.render('home', {keywordsOrder: bookKeywords, searchType: req.body.mediaType, searchInput: req.body.searchInput, books: metaData, title: 'SeniorClub'});
      }
    });
  }else{
    omdb.search(general_omdb_params(req.body.searchInput, req.body.mediaType), function(err, data) {
      if(err){
        console.log(err);
        res.render('home', {keywordsOrder: bookKeywords, searchType: req.body.mediaType, searchInput: req.body.searchInput, books: metaData, title: 'SeniorClub'});
      } else {
        console.log(data.Search);
        res.render('home', {keywordsOrder: bookKeywords, searchType: req.body.mediaType, searchInput: req.body.searchInput, movieData: data.Search, books: metaData, title: 'SeniorClub'});
      }
    })
  }
})

app.post('/home/addtopic',(req,res)=> {
  reload('home');
  console.log(req.body);
  fill_with_media(5);
  if (req.body.mediaType === "Book"){
    books.search(req.body.searchInput,options_for_key_search(field_name(req.searchType),0,4), function(err, data) {
      if (data){
        console.log(data[0].title)
        res.render('home', {keywordsOrder: bookKeywords, searchType: req.body.mediaType, searchInput: req.body.searchInput, searchData: data, books: metaData, title: 'SeniorClub'});
      }else{
        res.render('home', {keywordsOrder: bookKeywords, searchType: req.body.mediaType, searchInput: req.body.searchInput, books: metaData, title: 'SeniorClub'});
      }
    });
  }else{
    omdb.search(general_omdb_params(req.body.searchInput, req.body.mediaType), function(err, data) {
      if(err){
        console.log(err);
        res.render('home', {keywordsOrder: bookKeywords, searchType: req.body.mediaType, searchInput: req.body.searchInput, books: metaData, title: 'SeniorClub'});
      } else {
        console.log(data.Search);
        res.render('home', {keywordsOrder: bookKeywords, searchType: req.body.mediaType, searchInput: req.body.searchInput, movieData: data.Search, books: metaData, title: 'SeniorClub'});
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
      console.log("META DATA: " + metaData);
      console.log(bookKeywords);
      res.render('home', {keywordsOrder: bookKeywords, books: metaData, title: 'SeniorClub'});
    }
  })
})

app.post('/findMovie',(req,res)=> {
	var params = create_omdb_params(req.body.movieTitle);
	omdb.get(params, function(err, data) {
		data = data ||
		   {Poster: "https://images.costco-static.com/ImageDelivery/imageService?profileId=12026540&imageId=9555-847__1&recipeName=350"}
		res.render('media', {posterurl: data.Poster, title: 'Your Media'});
	});
})

app.post('/findBook',(req,res)=> {
  //console.log(req.body.bookTitle);
  books.search(req.body.bookTitle, function(err, data) {
    var url = data[0];
    url = url || {thumbnail:"https://www.iredell.lib.nc.us/ImageRepository/Document?documentID=441"}
    res.render('media', {posterurl: url.thumbnail, title: 'Your Media'});
  });
})


/*
app.get('/media', mediaController.getAllNotes );
app.post('/searchMedia', mediaController.saveNote);
app.post('/searchMedia', mediaController.deleteNote);
*/
app.use('/', function(req, res, next) {
  console.log("in / controller")
  res.render('home', { books:metaData, title: 'SeniorClub' });
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


console.log("before hook...");
app.use('/hook', function(req, res){
  console.log(JSON.stringify(req.body, null, 2));
  process_request(req, res);
});

function process_request(req,res){
  console.log(body.queryResult.parameters);
  var output_string = "there was an error";
  if(body.queryResult.intent.displayName === "search"){
    output_string = "MOVIES";
  }else{
    output_string = "test error!";
  }
  return res.json({
    "fufillmentMessages":[],
    "fufillmentText": output_string,
    "payload":{},
    "outputContexts":[],
    "source":"Test Source",
    "followupEventInput":{}
  })
}


module.exports = app;
