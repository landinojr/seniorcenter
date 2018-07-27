'use strict';
const mongoose = require( 'mongoose' );

var userSchema = mongoose.Schema( {
  googleid: String,
  googletoken: String,
  googlename: String,
  googleemail: String,
  readBooks: [{ name : String, url: String, poster: String, id: String}],
  readBookTitles: {'type':  [String], 'text' : true},
  bookIds: [String],
  watchedMovies: [{ name : String, url: String, poster: String, id: String}],
  //watchedMovieTitles: {'type':  [String], 'text' : true},
  movieIds: [String],
  googlepictureurl: String,
  phoneNumber: String,
  readBooks: [],
  watchedMovies: [],
  watchedTV: [],
  friends: [],
  mediaServices: [],
  genres: [],
  mediaPreferences: []
} );
