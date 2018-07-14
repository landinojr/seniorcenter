'use strict';
const mongoose = require( 'mongoose' );

//var userSchema = mongoose.Schema( {any:{}})

var userSchema = mongoose.Schema( {
  googleid: String,
  googletoken: String,
  googlename: String,
  googleemail: String,
  mediaServices: [],
  genres: [],
  mediaPreferences: []
} );

module.exports = mongoose.model( 'User', userSchema );
