var MyData = [];
exports.getMovie = function (data){
  const imdb = require('imdb-api');

  imdb.search({
    title: String(data)
  }, {
    apiKey: '5530cdc3'

  }).then(console.log).catch(console.log);

}



exports.save_movie_from_data = function (data){
	//Create new movie object and display in console
	console.log("Saving movie data...");
	var new_movie = new Movie( {
    	movieid: data.imdbID,
  		title: data.Title,
  		year: data.Year,
  		posterurl: data.Poster
  } )
	//Save new movie object and display in console
	new_movie.save(function(err,result){
		console.log(new_movie.title + " data saved!");
	});
}
exports.search_book_title = function(title){
  books.search(title, function(error, data) {
    if ( ! error ) {
        console.log(data[0]);
        save_book_from_data(data[0])
    } else {
        console.log(error);
    }
  });
}

exports.save_book_from_data = function(data){
  //Create new book object and display in console
  console.log("Saving book data...");
  var new_book = new Book( {
      title: data.title,
      authors: data.authors,
      publishedDate: data.publishedDate,
      description: data.description,
      pageCount: data.pageCount,
      posterURL: data.thumbnail,
      link: data.link
  });
  //Save new movie object and display in console
  new_book.save = function(){
  console.log("Book data saved!");
  }
}

exports.create_omdb_params = function(title){
	//declare and return functions
  console.log(title)
	var params = {
    	apiKey: 'f7cb9dc5',
    	title: title

	}
  console.log(params)
	return params;
}

exports.get_posterURL = function(title){
	var params = create_omdb_params(title);
	omdb.get(params, function(err, data) {
		return data.Poster;
	});
}

exports.options_for_key_search = function(shift){
  //declare and return functions
  var options = {
    field:'subject',
    limit: 1,
    offset:shift,
    type: 'books',
    order: 'relevance',
    lang: 'en'
  }
  return options;
}

exports.random_int = function(max){
  return Math.floor(Math.random()*max);
}
