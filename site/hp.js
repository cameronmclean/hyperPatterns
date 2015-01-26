//this is the express.js version of hyperPatterns API
// trying to avoid other middleware / libraries that were causing toruble.


var bodyParser = require('body-parser');
var express = require('express');
var async = require('async');
var _ = require('underscore');
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

app.get('/patterns/:pNum/force/:fNum', function(req, res){
	var pNum = req.params.pNum;
	var fNum = req.params.fNum;
	var listOfForces = [];
	var forceMatch = {};
	var progress = 0; 

	console.log("you tried to get pattern "+pNum+" and force "+fNum);

	getPattern(pNum);
	//addContext();
	
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
							if(body.force){ //make sure body.force is defined
								listOfForces = body.force;
								console.log("force list passed to getForces()"+listOfForces[0]);
								progress++;
								console.log('progress from getPattern = '+progress);
								getForces(listOfForces); //<------------if all done, move to next function
							}
							else{ // body.force err
								goToError("error getting force list from pattern");
							}
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
					goToError("pattern doc not found in db list!");
				 }

			}
			
			else{
				goToError(err);
			}
		});
	}

	function getForces(array){
		console.log("getForces");
				// a list of all force nums and id in the db
		db.get('_design/patterns/_view/getForceByNum', function(err, body){
			if(!err){
				var list = body['rows']; //list of force numbers to check
				console.log(body['rows']);
				var counter = 0; // counter available outside of for loop
	
				//test to see if :fNum matches a force doc on the list
				//if so get it							
				for (var x=0; x < list.length; x++){

					if (String(list[x].value) === fNum){
						db.get(list[x].id, function(err, body){
							forceMatch = body;
							delete forceMatch['_id'];
							delete forceMatch['_rev'];
							delete forceMatch['int_id'];
							delete forceMatch['parentPattern'];
							delete forceMatch['docType'];
							progress++;
							console.log('progress from getForces = '+progress);
							//console.log("we done got forces! "+JSON.stringify(forceMatch));
							//if context alread added...
						//	if (progress === 3){  
						//		res.send(JSON.stringify(forceMatch, null, 2)); //<---------we're all done
						//	}
							addContext(forceMatch); //<------------if all done, move to next function
						});
					}
					else {
						counter++;
						console.log("counter = "+counter+" progress = "+progress);
					}
				}
				
				// if we have been through the for loop and found nothing....
				if (counter === list.length && progress < 2){
					console.log("no match!");
					goToError("force doc not found in db list!");
				 }

			}
			
			else{
				goToError(err);
			}
		});
	}

	function addContext(match){
		db.get('force', function(err, body){
			match['@context'] = body['@context'];
			match['@id'] = 'http://patterns/'+pNum+"/force/"+fNum; // <--------- we add @id of resource to the JSONLD here
			progress++
			console.log('progress from addContext = '+progress);
			//if forceDoc content already done
			if (progress === 3){
				res.send(JSON.stringify(match, null, 2));
			}
		});
	}

	function goToError(err){
		console.log("**********error getting pattern doc "+pNum+" and force "+fNum+" ... "+err);
		res.sendStatus(404);
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
							getPatternForces(docToPass); //<------------if all done, move to next function
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
		//console.log("getForces called! with parameter "+patternDoc);
		//this function is called after a successful getPattern()
		//we extract the force references, fetch from db, and marshall them into the docToSend
		var forceDetails = []; //array to store whole forces docs from db
		var listOfForceDocs = patternDoc.force;

		async.each(listOfForceDocs, function(force, callback){
			db.get(force, function(err, body){
				if(!err){
				body['@id'] = "http://patterns.org/patterns/"+intID+"/force/"+body.int_id;
				forceDetails.push(body);
				//console.log(body);
				callback(); //so we can escape to the final function
				}
			});
		 },
		 // called afer all the iterations above
		 function(err){
		 	if(!err){
		 	docToSend['force'] = forceDetails;
		 	getPatternContributors(docToSend);  //<--------if we're done, move to next function
		 //	res.send(JSON.stringify(docToSend, null, 2));
		    }
		    else {
		    	goToError(err);
		    }
		 }

		);
	}

	//called after successful getPatternForces()
	function getPatternContributors(patternDoc){
		var contribDetails = [];
		var listOfContributors = patternDoc.author;

		async.each(listOfContributors, function(contrib, callback){
			db.get(contrib, function(err, body){
				if(!err){
					body['@id'] = "http://patterns.org/patterns/contributor/"+body.ORCID.slice(-19);
					contribDetails.push(body);
					callback();
				}
			});
		 },
		 function(err){
		 	if(!err){
		 		docToSend['author'] = contribDetails;
		 		getPatternReferences(docToSend);
		 		//res.send(JSON.stringify(docToSend, null, 2));
		 	}
		 	else {
		 		goToError(err);
		 	}
		 }
		);

	}
		
	//called after succesful getPatternContributors
	function getPatternReferences(patternDoc){
		var refDetails = [];
		var listOfReferences = patternDoc.evidence;
	
		async.each(listOfReferences, function(ref, callback){
			db.get(ref, function(err, body){
				if(!err){
					body['@id'] = "http://patterns.org/patterns/"+intID+"/evidence/"+body.int_id;
					refDetails.push(body);
					callback();
				}
			});
		 },
		 function(err){
		 	if(!err){
		 		docToSend['evidence'] = refDetails;
		 		marshalContext(docToSend); //<- if we're done, move to next function
		 		//res.send(JSON.stringify(docToSend, null, 2));
		 	}
		 	else {
		 		goToError(err);
		 	}
		 }
		);
	}

	function marshalContext(){
		var contextDetails = {}
		var contextsToGet = ['pattern', 'bibTEX', 'force', 'contributor']
		//the function to grab all the context docs, wrangle them and add to the docToSend
		async.each(contextsToGet, function(context, callback){
			db.get(context, function(err, body){
				if(!err){
					_.extend(contextDetails, body['@context']); // we use the underscore lib to add more fields to a JSON
					callback();
				}
			});
		 },
		 function(err){
		 	if(!err){
		 		docToSend['@context'] = contextDetails;
		 		docToSend['@id'] = "http://patterns.org/patterns/"+intID;
		 		res.send(JSON.stringify(docToSend, null, 2)); //<--- we're done, send the response! 
		 	}
		 	else {
		 		goToError(err);
		 	}
		 }
		);
	}

	function goToError(err){
		console.log("**********error getting pattern doc "+intID+" ... "+err);
		res.sendStatus(404);
	}

});
