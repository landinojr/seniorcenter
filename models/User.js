'use strict';
const mongoose = require( 'mongoose' );

var userSchema = mongoose.Schema( {
  googleid: String,
  googletoken: String,
  googlename: String,
  firstname: String,
  lastname: String,
  googleemail: String,
  bookKeywords: [String],
  keywordsToSearch: [String],
  metaData: {
    type: Map,
    of: Object
  },
  readBooks: [{ name : String, url: String, poster: String, id: String}],
  readBookTitles: {'type':  [String], 'text' : true},
  bookIds: [String],
  watchedMovies: [{ name : String, url: String, poster: String, id: String}],
  movieIds: [String],
  friends: [{ name : String, id: String}],
  friendIds: [String],
  profileimg: String,
  friendReqs: [String],
  phoneNumber: String
} );

module.exports = mongoose.model( 'User', userSchema );