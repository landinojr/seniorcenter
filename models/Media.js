'use strict';
const mongoose = require( 'mongoose' );

//var userSchema = mongoose.Schema( {any:{}})


const mediaTypes = Object.freeze({
    Movie: 'movie',
    Book: 'book',
    Song: 'song',
    Other: 'other',

});

var mediaSchema = mongoose.Schema( {
  title: String,
  mediaType: {
     type: String,
     enum: Object.values(mediaTypes),
  }
  authors: String,
  publishedDate: String,
  description: String,
  data: {},
} );

module.exports = mongoose.model( 'Media', mediaSchema );