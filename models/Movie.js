'use strict';
const mongoose = require( 'mongoose' );

var movieSchema = mongoose.Schema( {
  movieid: String,
  title: String,
  year: String,
  posterurl: String
} );

module.exports = mongoose.model( 'Movie', movieSchema );
