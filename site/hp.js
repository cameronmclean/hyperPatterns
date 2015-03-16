//this is the express.js version of hyperPatterns API
// trying to avoid other middleware / libraries that were causing toruble.


var bodyParser = require('body-parser');
var express = require('express');
var async = require('async');
var _ = require('underscore');
var fs = require('fs');
var bibtexParse = require('bibtex-parser-js');
var validator = require('validator');
var tv4 = require('tv4');

var app = express();

//couch db settings
var nano = require('nano')('http://127.0.0.1:5984');
var db = nano.use('patterns');


//we need this to parse and retreive the POST .body text
app.use(bodyParser.json());

//handle errors if we POST bad json... ie. body-parser returns Error: invalid json
app.use(function (error, req, res, next){
	console.log("error called "+error);
	if ( error.message === 'invalid json') {
	res.sendStatus(400);
	}
	else{
		console.log(error);
		res.sendStatus(500);
	}
});

var server = app.listen(3000, function() {
	var host = server.address().address;
	var port = server.address().port

	console.log("App listening at http://%s:%s", host, port);

}) ;


//routes
//*******************************************************************************


//*************************************
//* Redirects for conceptal resources *
//*************************************

// sets up the 303 redirect if folks try to dereference the pattern concept.
app.get('/id/pattern/:pid', function(req, res){
	res.writeHead(303, {
		'Location': 'http://127.0.0.1:3000/doc/pattern/'+req.params.pid
	});
	res.end();
});

app.get('/id/pattern/:pid/force/:fid', function(req,res){
	res.writeHead(303, {
		'Location': 'http://127.0.0.1:3000/doc/pattern/'+req.params.pid+'/force/'+req.params.fid
	});
	res.end();
});

app.get('/id/pattern/:pid/ref/:rid', function(req, res){
	res.writeHead(303, {
		'Location': 'http://127.0.0.1:3000/doc/pattern/'+req.params.pid+'/ref/'+req.params.rid
	});
	res.end();
});

app.get('/id/contributor/:cid', function(req, res){
	res.writeHead(303, {
		'Location': 'http://127.0.0.1:3000/doc/contributor/'+req.params.cid
	});
	res.end();
});


//app.get('/doc/patterns/:pid', function(req, res){
//	res.send("redirected to pattern doc resource"+req.params.pid);
//});

//***************************
//* Informational resources *
//***************************

app.get('/doc/contributor/:orcid', function(req, res){
	
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
		doc['@id'] = "http://patterns.org/contributor/"+docID;
		doc['@type'] = "http://purl.org/NET/labpatterns#Contributor";

		// then remove the db specific fields
		delete doc['_id'];
		delete doc['_rev'];
		delete doc['doctype'];

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

// note this is temp / for testing - we dont need to implement a POST to /contribitor.

app.post('/patterns/contributor', function(req, res){
	
	var payload = JSON.stringify(req.body, null, 2);
	//console.log(payload);
	
	if (JSON.parse(payload)){
	//	console.log("Looks legit");
		res.send("OK!");
	}
	else{
		res.send("Please submit valid JSON");
	}
	
});


//**********************************************************************************

app.get('/doc/pattern/:pNum/ref/:eNum', function(req, res){
	//check that pNum and eNum are numbers - save dblookup if its garbage
	if (isNaN(req.params.pNum) || isNaN(req.params.eNum)){
	 goToError();
	}
	
	else {
	var pNum = req.params.pNum;
	var eNum = req.params.eNum;
	var listOfReferences = [];
	var refMatch = {};
	var progress = 0;
	var docToSend = {};

	//start here and first try to get pattern doc with pNum
	getPattern(pNum);

	function getPattern(num){
		// a list of all pattern nums and id in the db
		db.get('_design/patterns/_view/getPatternByNum', function(err, body){
			if(!err){
				var list = body['rows'];
				var counter = 0; // counter available outside of for loop
	
				//test to see if :pNum matches a patter doc on the list
				//if so get it							
				for (var x=0; x < list.length; x++){
					//console.log("list.length = "+list.length);
					//console.log("before if, x = "+x);
					
					if (String(list[x].value) === num){
						db.get(list[x].id, function(err, body){
							if(body.evidence){ //make sure body.evidence is defined
								listOfReferences = body.evidence;
								progress++;
							//	console.log('progress from getPattern = '+progress);
								getReferences(listOfReferences); //<------------if all done (pattern doc exists, move to next function
							}
							else{ // body.force err
								goToError("error getting reference list from pattern");
							}
						});
					}
					else {
						counter++;
					//	console.log("counter = "+counter+" progress = "+progress);
					}
				}
				
				// if we have been through the for loop and found nothing....
				if (counter === list.length && progress < 1){
				//	console.log("no match!");
					goToError("pattern doc not found in db list!");
				 }

			}
			
			else{
				goToError(err);
			}
		});
	}

	
	function getReferences(array){
				// a list of all f nums and id in the db
		db.get('_design/patterns/_view/getRefByNum', function(err, body){
			if(!err){
				var list = body['rows']; //list of Reference numbers to check
				//console.log(body['rows']);
				var counter = 0; // counter available outside of for loop
	
				//test to see if :eNum matches a force doc on the list
				//if so get it							
				for (var x=0; x < list.length; x++){

					if (String(list[x].value) === eNum){
						db.get(list[x].id, function(err, body){
							refMatch = body;
							delete refMatch['_id'];				//delete all the coucdb interal key/values
							delete refMatch['_rev'];
							delete refMatch['int_id'];
							delete refMatch['parentPattern'];
							delete refMatch['doctype'];
							progress++;
							//console.log('progress from getReferences = '+progress);
							addContext(refMatch); //<------------if all done, move to next function
						});
					}
					else {
						counter++;
						//console.log("counter = "+counter+" progress = "+progress);
					}
				}
				
				// if we have been through the for loop and found nothing....
				if (counter === list.length && progress < 2){
					//console.log("no match!");
					goToError("ref doc not found in db list!");
				 }

			}
			
			else{
				goToError(err);
			}
		});
	}

	function addContext(match){
		db.get('bibTEX', function(err, body){
			match['@context'] = body['@context'];
			match['@id'] = 'http://patterns/'+pNum+"/evidence/"+eNum; // <--------- we add @id of resource to the JSONLD here
			match['@type'] = 'http://purl.org/NET/labpatterns#Reference'; //<----------- and declare that this resource is type Reference
			progress++
			//console.log('progress from addContext = '+progress);
			//if forceDoc content already done
			if (progress === 3){
				res.send(JSON.stringify(match, null, 2));
			}
		});
	}
}//closes else at top of route
	
	function goToError(err){
		console.log("**********error getting pattern doc "+pNum+" and evidence "+eNum+" ... "+err);
		res.sendStatus(404);
	}

});

//**********************************************************************************

app.get('/doc/pattern/:pNum/force/:fNum', function(req, res){
	//check that pNum and fNum are numbers - save dblookup if its garbage
	if (isNaN(req.params.pNum) || isNaN(req.params.fNum)){
	 goToError();
	}
	
	else {
	var pNum = req.params.pNum;
	var fNum = req.params.fNum;
	var listOfForces = [];
	var forceMatch = {};
	var progress = 0; 

	//console.log("you tried to get pattern "+pNum+" force "+fNum);

	//first - try to get pattern with pNum
	getPattern(pNum);
	
	function getPattern(num){
		// a list of all pattern nums and id in the db
		db.get('_design/patterns/_view/getPatternByNum', function(err, body){
			if(!err){
				var list = body['rows'];
				var counter = 0; // counter available outside of for loop
	
				//test to see if :pNum matches a patter doc on the list
				//if so get it							
				for (var x=0; x < list.length; x++){
					//console.log("list.length = "+list.length);
					//console.log("before if, x = "+x);
					
					if (String(list[x].value) === num){
						db.get(list[x].id, function(err, body){
							if(body.force){ //make sure body.force is defined
								listOfForces = body.force;
							//	console.log("force list passed to getForces()"+listOfForces[0]);
								progress++;
							//	console.log('progress from getPattern = '+progress);
								getForces(listOfForces); //<------------if all done (pattern doc exists, move to next function
							}
							else{ // body.force err
								goToError("error getting force list from pattern");
							}
						});
					}
					else {
						counter++;
					//	console.log("counter = "+counter+" progress = "+progress);
					}
				}
				
				// if we have been through the for loop and found nothing....
				if (counter === list.length && progress < 1){
				//	console.log("no match!");
					goToError("pattern doc not found in db list!");
				 }

			}
			
			else{
				goToError(err);
			}
		});
	}

	function getForces(array){
				// a list of all force nums and id in the db
		db.get('_design/patterns/_view/getForceByNum', function(err, body){
			if(!err){
				var list = body['rows']; //list of force numbers to check
				//console.log(body['rows']);
				var counter = 0; // counter available outside of for loop
	
				//test to see if :fNum matches a force doc on the list
				//if so get it							
				for (var x=0; x < list.length; x++){

					if (String(list[x].value) === fNum){
						db.get(list[x].id, function(err, body){
							forceMatch = body;
							delete forceMatch['_id'];				//delete all the coucdb interal key/values
							delete forceMatch['_rev'];
							delete forceMatch['int_id'];
							delete forceMatch['parentPattern'];
							delete forceMatch['doctype'];
							delete forceMatch['_attachments'];
							progress++;
							console.log('progress from getForces = '+progress);
							addContext(forceMatch); //<------------if all done, move to next function
						});
					}
					else {
						counter++;
						//console.log("counter = "+counter+" progress = "+progress);
					}
				}
				
				// if we have been through the for loop and found nothing....
				if (counter === list.length && progress < 2){
					//console.log("no match!");
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
			match['@type'] = 'http://purl.org/NET/labpatterns#Force'; //<----------- and declare that this resource is type Force
			progress++
			//console.log('progress from addContext = '+progress);
			//if forceDoc content already done
			if (progress === 3){
				res.send(JSON.stringify(match, null, 2));
			}
		});
	}
}//closes else at top

	function goToError(err){
		console.log("**********error getting pattern doc "+pNum+" and force "+fNum+" ... "+err);
		res.sendStatus(404);
	}

});



//**********************************************************************************

app.get('/doc/pattern/:intID', function(req, res){
	
	//check that intID is a number - save dblookup if its garbage
	if (isNaN(req.params.intID)){
	 goToError();
	}
	
	else {
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
		
					if (String(list[x].value) === num){
						db.get(list[x].id, function(err, body){
							docToSend = JSON.parse(JSON.stringify(body));
							//console.log(docToSend);
							progress++;
							var docToPass = JSON.parse(JSON.stringify(docToSend)); //? ? eh?
							getPatternForces(docToPass); //<------------if all done, move to next function
						});
					}
					else {
						counter++;
						//console.log("counter = "+counter+" progress = "+progress);
					}
				}
				
				// if we have been through the for loop and found nothing....
				if (counter === list.length && progress < 1){
					//console.log("no match!");
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
				body['@type'] = "http://purl.org/NET/labpatterns#Force";
				delete body['_id'];
				delete body['_rev'];
				delete body['doctype'];
				delete body['int_id'];
				delete body['parentPattern'];
				delete body['_attachments'];
				forceDetails.push(body);
				callback(); //so we can escape to the final function
				}
			});
		 },
		 // called afer all the iterations above
		 function(err){
		 	if(!err){
		 	docToSend['force'] = forceDetails;
		 	getPatternContributors(docToSend);  //<--------if we're done, move to next function
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
					body["@type"] = "http://purl.org/NET/labpatterns#Contributor";
					delete body['_id'];
					delete body['_rev'];
					delete body['_doctype'];
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
					body['@type'] = "http://purl.org/NET/labpatterns#Reference";
					delete body['_id'];
					delete body['_rev'];
					delete body['int_id'];
					delete body['parentPattern'];
					delete body['doctype'];
					refDetails.push(body);
					callback();
				}
			});
		 },
		 function(err){
		 	if(!err){
		 		docToSend['evidence'] = refDetails;
		 		marshalContext(docToSend); //<- if we're done, move to next function
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
		 		docToSend['@type'] = "http://purl.org/NET/labpatterns#DesignPattern";
		 		delete docToSend['_id'];
		 		delete docToSend['_rev'];
		 		delete docToSend['int_id'];
		 		delete docToSend['doctype'];
		 		delete docToSend['_attachments'];
		 		res.send(JSON.stringify(docToSend, null, 2)); //<--- we're done, send the response! 
		 	}
		 	else {
		 		goToError(err);
		 	}
		 }
		);
	}
}//end else at top

	function goToError(err){
		console.log("**********error getting pattern doc "+intID+" ... "+err);
		res.sendStatus(404);
	}

});

//************************************************************

app.get('/patterns/:intID/:img', function(req, res){

	var intID = req.params.intID;
	var img = req.params.img;
	var progress = 0;

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
		
					if (String(list[x].value) === num){
						db.get(list[x].id, function(err, body){
							if ( img in body._attachments) { 
							console.log("img exists!");
							var docName = body._id;
							db.attachment.get(docName, img, function(err, body){
								if(!err){
									fs.write(img, body);
									res.send(body);
								}
							});
							//docToSend = JSON.parse(JSON.stringify(body));
							//console.log(docToSend);
							progress++;
							}
							else {
								console.log("pattern pic not found");
								goToError("Image not found");
							}
							//var docToPass = JSON.parse(JSON.stringify(docToSend)); //? ? eh?
							//getPatternForces(docToPass); //<------------if all done, move to next function
						});
					}
					else {
						counter++;
						//console.log("counter = "+counter+" progress = "+progress);
					}
				}
				
				// if we have been through the for loop and found nothing....
				if (counter === list.length && progress < 1){
					//console.log("no match!");
					goToError("doc not found in db list!");
				 }

			}
			
			else{
				goToError(err);
			}
		});
	}

	function goToError(err){
		console.log("**********error getting pattern pic "+img+" ... "+err);
		res.sendStatus(404);
	}

});

//************************************************************

app.get('/patterns/:intID/diagram/:img', function(req, res){

	var intID = req.params.intID;
	var img = req.params.img;
	var progress = 0;

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
		
					if (String(list[x].value) === num){
						db.get(list[x].id, function(err, body){
							if ( img in body._attachments) { 
							console.log("img exists!");
							var docName = body._id;
							db.attachment.get(docName, img, function(err, body){
								if(!err){
									fs.write(img, body);
									res.send(body);
								}
							});
							//docToSend = JSON.parse(JSON.stringify(body));
							//console.log(docToSend);
							progress++;
							}
							else {
								console.log("pattern pic not found");
								goToError("Image not found");
							}
							//var docToPass = JSON.parse(JSON.stringify(docToSend)); //? ? eh?
							//getPatternForces(docToPass); //<------------if all done, move to next function
						});
					}
					else {
						counter++;
						//console.log("counter = "+counter+" progress = "+progress);
					}
				}
				
				// if we have been through the for loop and found nothing....
				if (counter === list.length && progress < 1){
					//console.log("no match!");
					goToError("doc not found in db list!");
				 }

			}
			
			else{
				goToError(err);
			}
		});
	}

	function goToError(err){
		console.log("**********error getting pattern diagram "+img+" ... "+err);
		res.sendStatus(404);
	}

});

//**********************************************************************************

app.get('/patterns/:pNum/force/:fNum/:img', function(req, res){
	var pNum = req.params.pNum;
	var fNum = req.params.fNum;
	var img = req.params.img;
	var listOfForces = [];
	var forceMatch = {};
	var progress = 0; 

	//console.log("you tried to get pattern "+pNum+" force "+fNum);

	//first - try to get pattern with pNum
	getPattern(pNum);
	
	function getPattern(num){
		// a list of all pattern nums and id in the db
		db.get('_design/patterns/_view/getPatternByNum', function(err, body){
			if(!err){
				var list = body['rows'];
				var counter = 0; // counter available outside of for loop
	
				//test to see if :pNum matches a patter doc on the list
				//if so get it							
				for (var x=0; x < list.length; x++){
					//console.log("list.length = "+list.length);
					//console.log("before if, x = "+x);
					
					if (String(list[x].value) === num){
						db.get(list[x].id, function(err, body){
							if(body.force){ //make sure body.force is defined
								listOfForces = body.force;
							//	console.log("force list passed to getForces()"+listOfForces[0]);
								progress++;
							//	console.log('progress from getPattern = '+progress);
								getForces(listOfForces); //<------------if all done (pattern doc exists, move to next function
							}
							else{ // body.force err
								goToError("error getting force list from pattern");
							}
						});
					}
					else {
						counter++;
					//	console.log("counter = "+counter+" progress = "+progress);
					}
				}
				
				// if we have been through the for loop and found nothing....
				if (counter === list.length && progress < 1){
				//	console.log("no match!");
					goToError("pattern doc not found in db list!");
				 }

			}
			
			else{
				goToError(err);
			}
		});
	}

	function getForces(array){
				// a list of all force nums and id in the db
		db.get('_design/patterns/_view/getForceByNum', function(err, body){
			if(!err){
				var list = body['rows']; //list of force numbers to check
				//console.log(body['rows']);
				var counter = 0; // counter available outside of for loop
	
				//test to see if :fNum matches a force doc on the list
				//if so get it							
				for (var x=0; x < list.length; x++){

					if (String(list[x].value) === fNum){
						db.get(list[x].id, function(err, body){
							if ( body._attachments && img in body._attachments ) { 
								console.log("img exists!");
								var docName = body._id;
								db.attachment.get(docName, img, function(err, body){
									if(!err){
										fs.write(img, body);
										res.send(body);
									}
								});
								progress++;
							}
							else{
								goToError("image not found!");
							}
						});
					}
					else {
						counter++;
						//console.log("counter = "+counter+" progress = "+progress);
					}
				}
				
				// if we have been through the for loop and found nothing....
				if (counter === list.length && progress < 2){
					//console.log("no match!");
					goToError("force doc not found in db list!");
				 }

			}
			
			else{
				goToError(err);
			}
		});
	}


	function goToError(err){
		console.log("**********error getting pattern doc "+pNum+" and force "+fNum+" pictogram "+img+"   "+err);
		res.sendStatus(404);
	}

});

//*****************************************
app.get('/new', function(req, res){

	console.log("yay! someone is requesting a new pattern!");

	//get the new/blank schema from the db, change a few fields and send.
	//note = changes to the 'patternSchema' doc are set in the helper script syncSchemaDocs.js
	db.get('patternSchema', function(err, body){
		if (!err) {
			delete body['_id'];
			delete body['_rev'];
			body['doctype'] = 'newpattern';
			res.send(body);
		}
		else
		{
			res.sendStatus(404);
		}
	});
});

//*********************************************
app.post('/new', function(req, res){
	console.log("were posting to new!");
	//note body-parser should check for valid JSON first.
	//if OK it is parsed into req.body object.

	//copy req.body object to payload
	var payload = req.body;

	checkPayload(payload);

	//validate payload against schema for newly sumbitted pattern
	function checkPayload(postInput){
		db.get('newPatternValidationSchema', function(err, body){
			if(!err){
				var schema = body;
				//remove db specific fields from schema
				delete schema["_id"];
				delete schema["_rev"];
				delete schema['doctype'];

				console.log(postInput);

				var valid = tv4.validate(JSON.stringify(postInput), JSON.stringify(schema));

				if (valid === true){
					console.log("payload validates! "+valid);
					//res.send("OK!");
					//go to wrangle next
					saveNewProtoPattern(postInput);
				}
				else{
					console.log("nope - validation returned "+valid);
					res.sendStatus(400);
				}

			}
			else{
				console.log("error getting validation schema from db"+err);
				goToError();
			}
		});
	}

	// if checkpayload validates, this is called to persist data as proto pattern to couchdb
	function saveNewProtoPattern(input){

		var newID = null;
		//get the 
		//modify fields in preparation for save to db
		//note this is the first time we save/create a protopattern doc - _id and _rev dont exist yet..
		input['doctype'] = "protopattern";
		input['revision'] = 1;
		//fetch the number of pattern and protopattern docs - set new int_id to one higher than the highest
		db.get('_design/patterns/_view/getLastIntID', function(err, body){
			//console.log(body.rows.length);
			var listOfResults = body.rows;
			var listOfValues = [];
			for (x in listOfResults){
				listOfValues.push(listOfResults[x].value);
			}
			newID = Math.max.apply(Math, listOfValues)+1;
			//console.log("latest Int ID = "+newID);
			//now set the new unique int_id for this pattern
			input['int_id'] = newID;

			//now save the newly created protopattern 
			db.insert(input, null, function(err, body){
				if(!err){
					res.send("saved OK!");
				}
				else{
					goToError(err);
				}
			});
		});
	}

	//check to see if object converts to valid JSON
//	var check = JSON.stringify(payload);
//		if (validator.isJSON(check)){
//			console.log("passed isJSON test");
//			console.log("and we can access payload object context "+payload['context']);
//			res.send("OK!")
//		}
//		else{
//			console.log('failed test - isJSON');
//			goTo400();
//		}
//	}
//	else {
//		console.log("failed first test");
//		goTo400();
//	}
	
//	function goTo400(err){
//		console.log("doesnt appear to be proper JSON or a newpattern doc");
//		res.sendStatus(400);
//	} 
	function goToError(err){
		console.log(err);
		res.sendStatus(500);
	}
});


