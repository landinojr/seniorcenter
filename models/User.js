'use strict';
const mongoose = require( 'mongoose' );

//var userSchema = mongoose.Schema( {any:{}})

var userSchema = mongoose.Schema( {
  googleid: String,
  googletoken: String,
  googlename: String,
  googleemail: String,
  googlepictureurl: String,
  readBooks: [],
  watchedMovies: [],
  watchedTV: [],
  friends: [],
  mediaServices: [],
  genres: [],
  mediaPreferences: []
} );

module.exports = mongoose.model( 'User', userSchema );
