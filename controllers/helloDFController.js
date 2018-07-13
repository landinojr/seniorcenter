var methods = require('../helpers/methods.js');
var omdb = require('omdb-client');

exports.respondToDF =  (req, res) => {
  console.log(req.body)
  var output_string = proccess_request(req, res)
  //console.log(output_string)

//  const v2Response =
//  {
//    "fulfillmentText": output_string,
//  }

//  res.json(v2Response);
};
function proccess_request(req,res){
  var async = require('async');
  var output_String

  if(req.body.queryResult.intent.displayName === "search"){
    //output_string = "MOVIES";
  var movieName = req.body.queryResult.parameters["movie-title"]
    var a = methods.create_omdb_params(movieName)

    async.series([
      function(callback){
        methods.getMovieData(movieName, callback);
      },
    ], function(err, results){
      if(err){
        res.status(400);
        res.json(err);
      } else {
        //send result
        const data = results[0];
        console.log("=====================")
        console.log(data)
        //output_string = data.title
        console.log("=========== 888888888 ==========")
        console.log(data.Title)

        output_String = data.Title + " " + data.Year + " " + data.Plot

        return res.json({
          "fulfillmentMessages": [],
          "fulfillmentText": output_String,
          "payload": {"slack":{"text":output_String}},
          "outputContexts": [],
          "source": "Test Source",
          "followupEventInput": {}
        })
      }
    })



  }else{
    return output_string = "test error!";

  }
}

function getMovieData(title) {
	var params = methods.create_omdb_params(title);
  var data
	omdb.get(params, function(err, data) {
		data = data ||
		   {title: title,
       year: year}
       console.log("=======================")
       console.log(data)
       console.log("=======================")

	});
  return data
}
function create_omdb_params(title){
	//declare and return functions
  console.log(title)
	var params = {
    	apiKey: 'f7cb9dc5',
    	title: title

	}
  console.log(params)
	return params;
}
