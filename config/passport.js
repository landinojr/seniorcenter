var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

// load up the user model
var User  = require('../models/user');

// load the auth variables
var configAuth = require('./auth');

exports.test = function(passport) {
  console.log('in passport.js')
  // used to serialize the user for the session
  passport.serializeUser(function(user, done) {
    console.log('serializing user ' + user)
      done(null, user.id);
  });

  // used to deserialize the user
  passport.deserializeUser(function(id, done) {
    console.log('in deserializeUser')
      User.findById(id, function(err, user) {
          done(err, user);
      });
  });

  passport.use(new GoogleStrategy({

      clientID        : configAuth.googleAuth.clientID,
      clientSecret    : configAuth.googleAuth.clientSecret,
      callbackURL     : configAuth.googleAuth.callbackURL,

  },
  function(token, refreshToken, profile, done) {

      // make the code asynchronous
      // User.findOne won't fire until we have all our data back from Google
      process.nextTick(function() {
         console.log("looking for userid")
          // try to find the user based on their google id
          User.findOne({ 'googleid' : profile.id }, function(err, user) {
              if (err)
                  return done(err);
              if (user) {
                  console.log('user found: ' + user)
                  // if a user is found, log them in
                  return done(null, user);
              } else {
                  console.log('no user found - creating new user')
                  console.dir(profile)
                  // if the user isnt in our database, create a new user
                  var newUser
                   = new User(
                       {googleid: profile.id,
                        googletoken: token,
                        googlename: profile.displayName,
                        googleemail: profile.emails[0].value,
                        googlepictureurl: 'http://picasaweb.google.com/data/entry/api/user/' + profile.id + '?alt=json'
                      });

                  // set all of the relevant information
                  /*
                  newUser.google = {}
                  newUser.google.id    = profile.id;
                  newUser.google.token = token;
                  newUser.google.name  = profile.displayName;
                  newUser.google.email = profile.emails[0].value; // pull the first email
                  */
                  // save the user
                  newUser.save(function(err) {
                    console.log("saving the new user")
                      if (err)
                          throw err;
                      return done(null, newUser);
                  });
              }
          });
      });
  }));
};
