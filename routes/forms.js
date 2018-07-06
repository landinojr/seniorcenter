//import OMDBClient from '../node_modules/imdb-api/doc/interfaces'
//const client = OMDBClient(apikey=API_KEY)

var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('forms', { title: 'Forms' });
});

router.post('/', function(req, res, next) {
  if(req.body.movietitle) {
    const imdb = require('../node_modules/imdb-api');
    const movietitle = req.body.movietitle;
    const movie = imdb.get(movietitle, {apiKey: '5530cdc3', timeout: 30000});
    database.movies.push(movie)
    fs.writeFileSync('../data.json',JSON.stringify(database,null,' '))
    movies.push(movie)
    res.render('forms', { title: 'Forms', movietitle:movietitle });
  } else if(req.body.book_info) {
    const books = require('google-books-search');
    const book_info = req.body.book_info;
    const book = books.search(book_info)[0];
    database.books.push(book)
    fs.writeFileSync('../book_data.json',JSON.stringify(database,null,' '))
    books.push(book)
    res.render('forms', { title: 'Forms' });
  }
});

module.exports = router;
