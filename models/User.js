'use strict';
const mongoose = require( 'mongoose' );

var userSchema = mongoose.Schema( {
  googleid: String,
  googletoken: String,
  googlename: String,
  firstname: String,
  lastname: String,
  googleemail: String,
  readBooks: [{ name : String, url: String, poster: String, id: String}],
  readBookTitles: {'type':  [String], 'text' : true},
  bookIds: [String],
  watchedMovies: [{ name : String, url: String, poster: String, id: String}],
  //watchedMovieTitles: {'type':  [String], 'text' : true},
  movieIds: [String],
  friends: [{ name : String, id: String}],
  friendIds: [String],
  profileimg: String,
  friendReqs: [String]
} );

module.exports = mongoose.model( 'User', userSchema );