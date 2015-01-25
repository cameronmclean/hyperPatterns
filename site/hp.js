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


var server = app.listen(3000, function() {
	var host = server.address().address;
	var port = server.address().port

	console.log("App listening at http://%s:%s", host, port);

}) ;

//routes
//*******************************************************************************

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


//*******************************************************************************

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


//**********************************************************************************

app.get('/patterns/:intID', function(req, res){
	var intID = req.params.intID;
	var progress = 0;
	var docToSend = {};
	var forces = [];


	getPattern(intID);


	function getPattern(num){
		// a list of all pattern nums and id in the db
		db.get('_design/patterns/_view/getPatternByNum', function(err, body){
			if(!err){
				var list = body['rows'];
				var counter = 0; // counter available outside of for loop
	

				//test to see if :intID matches a patter doc on the list
				//if so get it							
				for (var x=0; x < list.length; x++){
					//console.log("list.length = "+list.length);
					//console.log("before if, x = "+x);
					
					if (String(list[x].value) === num){
						db.get(list[x].id, function(err, body){
							docToSend = JSON.parse(JSON.stringify(body));
							//console.log(docToSend);
							progress++;
							//res.send(JSON.stringify(docToSend, null, 2));
							console.log(docToSend);
							var docToPass = JSON.parse(JSON.stringify(docToSend));
							getPatternForces(docToPass);
						});
					}
					else {
						counter++;
						console.log("counter = "+counter+" progress = "+progress);
					}
				}
				
				// if we have been through the for loop and found nothing....
				if (counter === list.length && progress < 1){
					console.log("no match!");
					goToError("doc not found in db list!");
				 }

			}
			
			else{
				goToError(err);
			}
		});
	}


	function getPatternForces(patternDoc){
		console.log("getForces called! with parameter "+patternDoc);
		//this function is called after a successful getPattern()
		//we extract the force references, fetch from db, and marshall them into the docToSend
		var forceDetails = []; //array to store realted forces from db
		var newcounter = 0;
		var numberOfForces = patternDoc.force.length;

		//go and fetch the docs immediately 
		(function(){
			do {
				console.log('do it!');
				db.get(patternDoc.force[newcounter], function(err, body){
				//	console.log("force "+newcounter+" >>>>"+body);
				if(!err){
					console.log(newcount);
					forceDetails.push = body;
					console.log("doc "+newcounter+" retreived");
					newcounter++;
					console.log("counter incemented");
					//console.log(forceDetails[index].pic);
					//newcounter++;
					//console.log(newcounter+" "+patternDoc.force.length);						
					}
				});

			}
			while (newcounter < numberOfForces);
		})();

		console.log(forceDetails[1]);
		console.log("hello?");
	}

//		for (var x = 0; x < patternDoc.force.length; x++){
//
//			(function(index){ 
//			
//			if (index < patternDoc.force.length) {
//				db.get(patternDoc.force[index], function(err, body){
//				//	console.log("force "+newcounter+" >>>>"+body);
//					forceDetails[index] = body;
//					console.log(forceDetails[index].pic);
//					newcounter++;
//					console.log(newcounter+" "+patternDoc.force.length);						
//				});
//			}
//			
//			else {
//				docToSend['force'] = JSON.parse(JSON.stringify(forceDetails));
//				progress++;
//				res.send(JSON.stringify(docToSend, null, 2));
//			}
//		})(x);
//		}
		
//	}		
	
	

	function marshalContext(){
		//the function to grab all the context docs, wrangle them and add to the final docToSend
	}

	function goToError(err){
		console.log("**********error getting pattern doc "+intID+" ... "+err);
		res.sendStatus(404);
	}

});
