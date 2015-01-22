//This is the node, express/rest-connect, couch hypermedia API for lab pattens

//var express = require('express'); //<--------Express NOT USED?!


//API details
var http = require('http');
var connect = require('connect');
var rest = require('connect-rest');
var jsonld = require('jsonld');

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
rest.get('/patterns/contributor/:orcid', function(request, content, callback){

		
	var urlParams = request.parameters; //get parameters from request
	var docID = urlParams['orcid']; // get orcid for doc retrevial 
	console.log("request for pattern contributor with author ID "+docID);

	
	var doc = {}; //to store the final structure that will be returned
	var progress = 0; //a counter to mark number of async requests

	// to be called when all async requests to coucdb and responces have been marshalled
	function done(){

		console.log('this is the final doc!');
		console.log(JSON.stringify(doc, null, 2));
		callback(null, doc);
		//TODO - add code to push doc to HTTP response with appropriate headers
	}


	//takes the body from a db.get context doc, adds the @context to the doc
	//to be served by the API
	function wrangleContext(body){
	
		doc['@context'] = body['@context']; //just grab the @contex key and its values
		
		//if this function was called, db.get() was successful
		//update counter	
		progress++;
		//check if the main doc has been wrangled, proceed to final response if so
		if(progress === 2){
			done();
		}
	}

	function wrangleMainDoc(body){
		//set the final doc fields and keys to the retreived author doc
		//
		for (x in body){
			doc[x] = body[x];
			//console.log(body[x]);
		}

		// add subject to JSON-LD - prevent top level blank node
		doc['@id'] = "http://api.patterns.org/contributor/"+docID;

		// then remove the db specific fields
		delete doc['_id'];
		delete doc['_rev'];

		//if this function was called, db.get() was successful
		//update counter	
		progress++;
		//if the context doc has been wrangled, proceed to final response
		if(progress === 2){
			done();
		}
	}



	//orchstrates the calls to the db, and subsequent doc wrangling
	function getDoc() {
		db.get(docID, function(err, body){
			if (!err){
				wrangleMainDoc(body);
			}
			else{
				console.log(err);
				goToError(err);				
				}
			}
		);

		db.get('contributor', function(err, body){
			wrangleContext(body);
		});
	}

	//do it all 
	getDoc();

	//if error fetching db.get() main doc
	function goToError(err){
		return callback("Failed getting document, status code "+err.statusCode);
				//if (err.statusCode === 404){
				//	console.log('404 bro!');
					//put and create general error handling
					//eg call a 404() function or 500() funciton that
					//is a catch-all for all failed requests
	}

});




// rest.get('/patterns/:pname/force/:fname', function)

//create a new pattern
//rest.post('/patterns', function(request, content){
//	
//	var newPattern = content;
//	console.log(content);
//
//	db.insert(newPattern);
//});