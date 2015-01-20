//This is the node, express/rest-connect, couch hypermedia API for lab pattens

//var express = require('express');


//API details
var http = require('http');
var connect = require('connect');
var rest = require('connect-rest');

var apiOptions = {
	contex: '/api',
	domain: require('domain').create(),
};

//create node.js http server and listen on port
var app = connect();
app.use( rest.rester( apiOptions ) );
http.createServer(app).listen(3000);
console.log("connect server started and listening on port 3000");

//couch db settings
var nano = require('nano')('http://127.0.0.1:5984');
var db = nano.use('patterns');

// First routing - return all patterns from couchDB as JSON-LD/hydra
//rest.get('/patterns', function(request, content){
	//return {"hello": "world"};	
//	return db.view('patterns', 'getAllPatterns', function(err, body){
//		if (!err){
//			console.log(body);
//		}
//	});
//});



//return json-ld of a specific pattern contributor/author
//rest-connect supports paramaterised paths :orcid value is 
//nested under parameters in the requests object: {"parameters": {"orcid": "value"}, ...} 
rest.get('/patterns/contributors/:orcid', function(request, content){
		
	var urlParams = request.parameters; //get parameters from request
	var docID = urlParams['orcid']; // get orcid for doc retrevial 
	console.log("request for pattern contributor with author ID "+docID);

	//code to get context doc, author doc by id, mix them, and return as json-ld
	//TROUBLE - nano, and callbacks/async nature - cant figure how to do this yet..
	// haveing variable scope issues.	
});

//create a new pattern
//rest.post('/patterns', function(request, content){
//	
//	var newPattern = content;
//	console.log(content);
//
//	db.insert(newPattern);
//});