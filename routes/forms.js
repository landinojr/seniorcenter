var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('forms', { title: 'Forms' });
});

router.post('/', function(req, res, next) {
  const imdb = require('../node_modules/imdb-api');
  const movietitle = req.body.movietitle;
  const movie = imdb.get(movietitle, {apiKey: '5530cdc3', timeout: 30000});
  database.movies.push(movie)
  fs.writeFileSync('../data.json',JSON.stringify(database,null,' '))
  movies.push(movie)
  res.render('forms', { title: 'Forms', movietitle:movietitle });
});

module.exports = router;
