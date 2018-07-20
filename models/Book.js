'use strict';
const mongoose = require( 'mongoose' );

//var userSchema = mongoose.Schema( {any:{}})

var bookSchema = mongoose.Schema( {
  title: String,
  authors: String,
  publishedDate: String,
  description: String,
  pageCount: Number,
  posterURL: String,
  link: String
} );

module.exports = mongoose.model( 'Book', bookSchema );
