//this is the express.js version of hyperPatterns API
// trying to avoid other middleware / libraries that were causing toruble.


var bodyParser = require('body-parser');
var express = require('express');
var app = express();

//couch db settings
var nano = require('nano')('http://127.0.0.1:5984');
var db = nano.use('patterns');

//we need this to parse and retreive the POST .body text
app.use(bodyParser.json());



app.get('/patterns/contributor/:orcid', function(req, res){
	
	var docID = req.params.orcid;
	
	console.log("request for pattern contributor with author ID "+docID);

	
	var doc = {}; //to store the final structure that will be returned
	var progress = 0; //a counter to mark number of async requests

	// to be called when all async requests to coucdb and responses have been marshaled
	function done(){
		console.log('Final doc assembled for response!');
		console.log(JSON.stringify(doc, null, 2));
		res.send(JSON.stringify(doc, null, 2));
		
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
				console.log("******* Error in /patterns/contributor getDoc() **********");
				console.log("Failed getting document "+docID+" , status code "+err.statusCode);
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
		
		res.sendStatus(404); // if there is an error getting docs from db, send 404
	}
});

app.post('/patterns/contributor', function(req, res){
	
	var payload = JSON.stringify(req.body, null, 2);
	console.log(payload);
	
	if (JSON.parse(payload)){
		console.log("Looks legit");
		res.send("OK!");
	}
	else{
		res.send("Please submit valid JSON");
	}
	
});


var server = app.listen(3000, function() {
	var host = server.address().address;
	var port = server.address().port

	console.log("App listening at http://%s:%s", host, port);

}) ;