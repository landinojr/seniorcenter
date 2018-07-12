'use strict';

const Note = require( '../models/note' );
console.log("loading the Note Controller")


// this displays all of the notes
exports.getAllNotes = ( req, res ) => {
  console.log('in getAllNotes');
  Note.find( {} )
    .exec()
    .then( ( note ) => {
      res.render( 'note', {
        note: note,
        user:req.user
      } );
    } )
    .catch( ( error ) => {
      console.log( error.message );
      return [];
    } )
    .then( () => {
      console.log( 'note promise complete' );
    } );
};




exports.saveNote = ( req, res ) => {
  //console.log("in saveSkill!")
  //console.dir(req)
  let newNote = new Note( {
    username: req.body.username,
    header: req.body.header,
    body: req.body.body
  } )

  //console.log("skill = "+newSkill)

  newNote.save()
    .then( () => {
      res.redirect( '/note' );
    } )
    .catch( error => {
      res.send( error );
    } )
  }


exports.deleteNote = (req, res) => {
  console.log("in deleteNote")
  let noteName = req.body.noteID
  if (typeof(noteName)=='string') {
      Note.deleteOne({_id:noteName})
           .exec()
           .then(()=>{res.redirect('/note')})
           .catch((error)=>{res.send(error)})
  } else if (typeof(noteName)=='object'){
      Note.deleteMany({_id:{$in:noteName}})
           .exec()
           .then(()=>{res.redirect('/note')})
           .catch((error)=>{res.send(error)})
  } else if (typeof(noteName)=='undefined'){
      console.log("This is if they didn't select a skill")
      res.redirect('/note')
  } else {
    console.log("This shouldn't happen!")
    res.send(`unknown noteName: ${noteName}`)
  }
}
