var methods = require('../helpers/methods.js');

exports.respondToDF =  (req, res) => {
  console.log(req.body)
  proccess_request(req, res)

  const v2Response =
  {
    "fulfillmentText": output_string,
  }

  res.json(v2Response);
};
function proccess_request(req,res){
  if(req.body.queryResult.intent.displayName === "search"){
    output_string = "MOVIES";
  var movieName = req.body.queryResult.parameters["movie-title"]
    methods.create_omdb_params(movieName)
    var x = methods.getMovie(movieName)
    console.log(x)

  }else{
    output_string = "test error!";

  }
}
