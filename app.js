var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var readline = require('readline-sync');
var omdb = require('omdb-client');

const Movie = require('./models/movie');
//OMDB API STUFF

function search_movie_title(title){
	//create search paramters
	var params = create_omdb_params(title);
	//call get function given paramters
	omdb.get(params, function(err, data) {
		//print and save data
    	console.log(data);
    	save_movie_from_data(data);
	});
}

function create_omdb_params(title,year,type,director){
	//declare and return functions
	var params = {
    	apiKey: 'f7cb9dc5',
    	title: title
	}
	return params;
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
	new_movie.save();
	console.log("Movie data saved!");
	console.log(new_movie);
}

//Test Prompt
search_movie_title(readline.question("Search for a movie or TV show: "));

/*GOOGLE BOOKS API*/
const books = require('google-books-search');
const Book = require('./models/Book')

var book_info = readline.question("Search for a book: ");

books.search(book_info, function(error, results) {
    if ( ! error ) {
        console.log(results[0]);
				save_book_from_data(results[0])
    } else {
        console.log(error);
    }
});

function save_book_from_data(data){
	//Create new book object and display in console
	console.log("Saving book data...");
	var new_book = new Book( {
  		title: data.title,
			authors: data.authors,
  		publishedDate: data.publishedDate,
  		description: data.description,
			pageCount: data.pageCount,
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

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/forms', formsRouter);

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

module.exports = app;
