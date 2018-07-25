'use strict';
const mongoose = require( 'mongoose' );

//var userSchema = mongoose.Schema( {any:{}})

var userSchema = mongoose.Schema( {
  googleid: String,
  googlename: String,
  firstName: String,
  lastName: String,
  googlepictureurl: String,
  phoneNumber: String,
  isAccepted: false
} );

module.exports = mongoose.model( 'User', userSchema );
