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
//Controllers
//const mediaController = require('./controllers/mediaController');

//Suggestion keywords
bookKeywords = ["kind","caring","stories","travel","fiction"];


function get_posterURL(title){
	var params = create_omdb_params(title);
	omdb.get(params, function(err, data) {
		return data.Poster;
	});
}

function options_for_key_search(shift){
  //declare and return functions 
  var options = {
    field:'subject',
    limit: 1,
    offset:shift,
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
        console.log(data[0]);
        save_book_from_data(data[0])
    } else {
        console.log(error);
    }
  });
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

app.get('/home',(req,res)=> {
  var query = bookKeywords[random_int(bookKeywords.length)];
  console.log(query);
  books.search(query,options_for_key_search(random_int(5)), function(err, data) {
    var url = data[0];
    url = url || {thumbnail:"https://images-na.ssl-images-amazon.com/images/I/41P-CfLMjwL._SX323_BO1,204,203,200_.jpg"}
    res.render('home', {posterurl: url.thumbnail, title: 'SeniorClub'});
  });
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
  console.log(req.body.bookTitle);
  books.search(req.body.bookTitle, function(err, data) {
    var url = data[0];
    url = url || {thumbnail:"https://www.iredell.lib.nc.us/ImageRepository/Document?documentID=441"}
    res.render('media', {posterurl: url.thumbnail, title: 'Your Media'});
  });
})

app.post('/home',(req,res)=> {
  var query = bookKeywords[random_int(bookKeywords.length)];
  console.log(query);
  books.search(query,options_for_key_search(random_int(5)), function(err, data) {
    var url = data[0];
    url = url || {thumbnail:"https://images-na.ssl-images-amazon.com/images/I/41P-CfLMjwL._SX323_BO1,204,203,200_.jpg"}
    res.render('home', {posterurl: url.thumbnail, title: 'SeniorClub'});
  });
})



/*
app.get('/media', mediaController.getAllNotes );
app.post('/searchMedia', mediaController.saveNote);
app.post('/searchMedia', mediaController.deleteNote);
*/
app.use('/', function(req, res, next) {
  console.log("in / controller")
  res.render('index', { title: 'SeniorClub' });
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
