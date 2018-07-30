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
  watchedMovieTitles: [String],
  readBookTitles: [String],
  currentIndex: String,
  bookIds: [String],
  watchedMovies: [{ name : String, url: String, poster: String, id: String}],
  movieIds: [String],
  friends: {
    type: Map,
    of: Object
  },
  notifications: [Object],
  profileimg: String,
  friendReqs: {
    type: Map,
    of: Object
  },
  phoneNumber: String,
  emailAddress: String
} );

userSchema.methods.isIndex = function isIndex (index) {
  console.log(userSchema.getIndexes());
};

module.exports = mongoose.model( 'User', userSchema );