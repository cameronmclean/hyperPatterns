//this is the express.js version of hyperPatterns API
// trying to avoid other middleware / libraries that were causing toruble.


//var bodyParser = require('body-parser');
var busboy = require('busboy');
var express = require('express');
var async = require('async');
var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var bibtexParse = require('bibtex-parser-js');
var validator = require('validator');
var tv4 = require('tv4');
var cors = require('cors');
var rimraf = require('rimraf');
var crypto = require('crypto');
var app = express();

//couch db settings
var nano = require('nano')('http://127.0.0.1:5984');
var db = nano.use('patterns');


//we need this to parse and retreive the POST .body text
// *** commented out here and above - using busboy multipart/form-data instead?

//app.use(bodyParser.json());
//app.use(busboy());


//enable CORS on all routes
app.use(cors());

//look for static files under the /public dir
app.use(express.static('public'));


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
		doc['@id'] = "http://labpatterns.org/id/contributor/"+docID;
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
			match['@id'] = 'http://labpatterns.org/id/pattern/'+pNum+"/ref/"+eNum; // <--------- we add @id of resource to the JSONLD here
			match['@type'] = 'http://purl.org/NET/labpatterns#Reference'; //<----------- and declare that this resource is type Reference
			match['partOf'] = 'http://labpatterns.org/id/pattern/'+pNum;
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
			match['@id'] = 'http://labpatterns.org/id/pattern/'+pNum+"/force/"+fNum; // <--------- we add @id of resource to the JSONLD here
			match['@type'] = 'http://purl.org/NET/labpatterns#Force'; //<----------- and declare that this resource is type Force
			match['partOf'] = 'http://labpatterns.org/id/pattern/'+pNum;
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
				body['@id'] = "http://labpatterns.org/id/pattern/"+intID+"/force/"+body.int_id;
				body['@type'] = "http://purl.org/NET/labpatterns#Force";
				//body['partOf'] = "http://labpatterns.org/id/pattern/"+intID;
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
					body['@id'] = "http://labpatterns.org/id/contributor/"+body.ORCID.slice(-19);
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
					body['@id'] = "http://labpatterns.org/id/pattern/"+intID+"/ref/"+body.int_id;
					body['@type'] = "http://purl.org/NET/labpatterns#Reference";
					//body['partOf'] = "http://labpatterns.org/pattern"+intID;
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
		 		docToSend['@id'] = "http://labpatterns.org/id/pattern/"+intID;
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

app.get('/doc/pattern/:intID/:img', function(req, res){

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
							//console.log("img exists!");
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

app.get('/doc/pattern/:intID/diagram/:img', function(req, res){

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
						//	console.log("img exists!");
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

app.get('/doc/pattern/:pNum/force/:fNum/:img', function(req, res){
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
								//console.log("img exists!");
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

//****************************************
//* Routes for web front-end
//*****************************************


//****************************************
app.get('/prototypes', function(req, res){
	//query the db for an array of prototype objects
	db.get('_design/patterns/_view/getPrototypes', function(err, body){
		
		var listOfPrototypes = body['rows'];
		var titles = [];
	//	console.log(listOfPrototypes);
		async.eachSeries(listOfPrototypes, function(proto, callback){
			//for each element in the array listOfPrototypes, fetch the doc in series
			//push the protopattern name and id to an array (titles)
			db.get(proto['id'], function(err, data){
				var thingy = {};
				thingy['name'] = data['name'];
				thingy['id'] = data['int_id'];
				titles.push(thingy);
			callback();
			});
		}, function(err){
			if(!err) {
				//We are done getting all the prototypes, send the list of titles and IDs as an array within a JSON.
				//console.log("call me");
				var titlesToSend = {};
				titlesToSend['list'] = titles;
				res.send(titlesToSend);
			}
		}
		);
	});

});

//*********************************
//to return data for alpaca forms in edit.html
app.get('/prototype/:intID', function(req, res){
	var protoID = req.params.intID;


	function wrangleAlpacas(doc){
		var wrangled = {}; // to store and return modified doc
		//assign the easy fields
		wrangled['name'] = doc['name'];
		wrangled['context'] = doc['context'];
		wrangled['problem'] = doc['problem'];
		wrangled['solution'] = doc['solution'];
		wrangled['rationale'] = doc['rationale'];
		wrangled['author'] = [];
		wrangled['forces'] = [];
		wrangled['ref'] = [];
		wrangled['int_id'] = doc['int_id'];
		wrangled['_attachments'] = doc['_attachments'];

		var keys = Object.keys(doc);
		var attachmentInfo = doc['_attachments'];

		

		//allow up to 20 for each authors/ref/forces -cycle through , push to array, then add to wrangled
		for (var x = 0; x < 20; x++){
	//		console.log("looping");
	//		console.log(keys.indexOf('author_'+String(x)+'_name'));
			if ( (keys.indexOf('author_'+String(x)+'_name') > -1) && (keys.indexOf('author_'+String(x)+'_orcid') > -1)){
	//			console.log('keys match');
				var author = {};
				author['name'] = doc['author_'+String(x)+'_name'];
				author['orcid'] = doc['author_'+String(x)+'_orcid'];
				wrangled['author'].push(author);
			}

			
			if( (keys.indexOf('forces_'+String(x)+'_name') > -1) && (keys.indexOf('forces_'+String(x)+'_definition') > -1) ){
				var forces = {};
				forces['name'] = doc['forces_'+String(x)+'_name'];
				forces['definition'] = doc['forces_'+String(x)+'_definition'];
				//is there an attachement?
				var re = new RegExp("^forces_"+String(x)+"_pic"), item;
				for (item in attachmentInfo){
				//	console.log(item);
					if (re.test(item)){
						//console.log("regex match!");
						//get and add the attachment filename
						forces['pic'] = ""+item;
					}

				}
				//if (attachmentInfo['forces_'+String(x)+'_pic']){
				//	console.log('attached file found!');

				//}
				wrangled['forces'].push(forces);
			}
		
			if( (keys.indexOf('ref_'+String(x)+'_reference') > -1) ){
				var ref = {};
				ref['reference'] = doc['ref_'+String(x)+'_reference'];
				wrangled['ref'].push(ref);
			}


		}

		return wrangled;
	}




	db.get('_design/patterns/_view/getPrototypes', function(err, body){
		if(err) console.log("error getting protopattern list from couch"+err);
		
		var listOfPrototypes = body['rows'];
				
		for (var x = 0; x < listOfPrototypes.length; x++){
			
			if (String(listOfPrototypes[x]['value']) === protoID){ //remember req.prams is a string
			//	console.log("match!");
				db.get(listOfPrototypes[x].id, function(err, doc){
					if (err) console.log("error getting proto doc" +err);
					//logic to rangle doc into alpaca forms data
					var wrangledData = wrangleAlpacas(doc);

					res.send(wrangledData);

				});
			}
		}
	});
});

//*******************************************
app.get('/prototype/:intID/:img', function(req, res){
	
	var intID = req.params.intID;
	var img = req.params.img;
	var progress = 0;

	getPattern(intID);

	function getPattern(num){
		// a list of all pattern nums and id in the db
		db.get('_design/patterns/_view/getProtoPatternByNum', function(err, body){
			if(!err){
				var list = body['rows'];
				var counter = 0; // counter available outside of for loop
	

				//test to see if :intID matches a patter doc on the list
				//if so get it							
				for (var x=0; x < list.length; x++){
		
					if (String(list[x].value) === num){
						db.get(list[x].id, function(err, body){
							if ( img in body._attachments) { 
							//console.log("img exists!");
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


//********************************************
app.get('/patternlist', function(req, res){
		db.get('_design/patterns/_view/getPatterns', function(err, body){
		
		var listOfPatterns = body['rows'];
		var titles = [];
	//	console.log(listOfPatterns);
		async.eachSeries(listOfPatterns, function(doc, callback){
			//for each element in the array listOfPrototypes, fetch the doc in series
			//push the protopattern name and id to an array (titles)
			db.get(doc['id'], function(err, data){
				var thingy = {};
				thingy['name'] = data['name'];
				thingy['id'] = data['int_id'];
				titles.push(thingy);
			callback();
			});
		}, function(err){
			if(!err) {
				//We are done getting all the prototypes, send the list of titles and IDs as an array within a JSON.
				//console.log("call me");
				var titlesToSend = {};
				titlesToSend['list'] = titles;
				res.send(titlesToSend);
			}
		}
		);
	});

});


//********************
//flip it for publishing
//***********************************
app.get("/publish/:intID", function(req, res){

	var intID = req.params.intID
//*****************************************************************************
	var putMainDoc = function(doc, callback){
	//console.log("putMainDoc "+doc['name']);

	var newDoc = {}; //copy over parts into new "doc" we use to progressivly overwrite the old one
					//the remaing bits we need _attachments etc should still be in mem via the first db.get doc object 

	
	var prefix = [];	


	newDoc['_id'] = doc['_id'];
	newDoc['_rev'] = doc['_rev'];
	newDoc['doctype'] = "pattern";
	newDoc['name'] = doc['name'];
	newDoc['authors'] = []; //will be an array of coucdb doc _id - added during cleanUp
	newDoc['context'] = doc['contex'];
	newDoc['problem'] = doc['problem'];
	newDoc['solution'] = doc['solution'];
	newDoc['rationale'] = doc['rationale'];
	newDoc['evidence'] = []; //will be an array of other couchdb doc _id - added during cleanUp
	newDoc['int_id'] = doc['int_id'];
	newDoc['force'] = []; //will be an array of other couchdb doc _id - added during cleanUp
	newDoc['_attachments'] = doc['_attachments'];

	//we need to get the pic and diagram filenames from the attachments
	
	if (doc['_attachments']) {

		var files = Object.keys(doc['_attachments']);

		//get a matching array of filename prefixes
		for (var i = 0; i < files.length; i++){
			var holder = files[i].split("__");
			prefix.push(holder[0]);
		}


		//see if 'pic' exists, if so encode the location
	 	var picPlace = prefix.indexOf("pic"); 
	 	if (picPlace != -1){
	 		newDoc["pic"] = "http://127.0.0.1:3000/doc/pattern/"+doc['int_id']+"/"+files[picPlace];
	 	} else {
	 		newDoc["pic"] = null;
		 }
	 	//do the same for diagram
	 	var diagramPlace = prefix.indexOf("diagram");
	 	if (diagramPlace != -1){
	 		newDoc["diagram"] = "http://127.0.0.1:3000/doc/pattern/"+doc['int_id']+"/diagram/"+files[picPlace];
	 	} else {
	 		newDoc['diagram'] = null;
		 }

	}
	//update the protopattern to pattern, still not done though...
	db.insert(newDoc, function(err, body){
		if(!err) { 

			callback(null);
			// db.get(body.id, function(err, body2){
			// 	//console.log("new doc rev "+body2._rev);
			// 	callback(null);
			// })
		}
		else {
			console.log("error in putMainDoc "+err)
			callback(err);
		}
	});
	
	}
//*****************************************************************************

	var putForces = function(doc, callback2){
		//console.log("putForces doc number "+doc['int_id']);
		//get arrary of force pics to save as attachemnts
			
		var keys = Object.keys(doc);

		var attachmentInfo = {};
		if (doc['_attachments']) {
			var attachmentInfo = doc['_attachments']
		} 
		
		//get attched files and read into mem


		//subset the keys that relate to forces, and group them in an array of objects to send to async.forEach
		var forceList = [];
		var forceAttachments = [];
		//we allow up to 20 forces
		for (var x = 0; x < 20; x++){
	//		console.log("looping");
	//		console.log(keys.indexOf('author_'+String(x)+'_name'));
			
			if( (keys.indexOf('forces_'+String(x)+'_name') > -1) && (keys.indexOf('forces_'+String(x)+'_definition') > -1) ){
				var forces = {};
				forces['name'] = doc['forces_'+String(x)+'_name'];
				forces['definition'] = doc['forces_'+String(x)+'_definition'];
				//is there an attachement?
				var re = new RegExp("^forces_"+String(x)+"_pic"), item;
				for (item in attachmentInfo){
				//	console.log(item);
					if (re.test(item)){
						console.log("regex match! "+item);
						//get and add the attachment filename
						var itemSuffix = item.split("__")
						forces['pic'] = ""+itemSuffix[1]; //just save/use the original filename
						var deetsForAddingAttachments = {};
						deetsForAddingAttachments['filename'] = item;
						deetsForAddingAttachments['newfilename'] = ""+itemSuffix[1];
						deetsForAddingAttachments['contenttype'] = attachmentInfo[item]["content_type"];
						forceAttachments.push(deetsForAddingAttachments);
					}

				}
				//if (attachmentInfo['forces_'+String(x)+'_pic']){
				//	console.log('attached file found!');

				//}
				forceList.push(forces);
			}

		}

		for (var i = 0; i < forceAttachments.length; i++){
			console.log("looping through forceAttachments "+forceAttachments[i]['filename']);
			console.log(forceAttachments[i]['newfilename']);
			console.log(forceAttachments[i]['contenttype']);

		}


	    var newForceDocs = []; //to store _id of newly created force docs

		//get array of filenames for force pics
		var filenames = [];
		for (var i =0; i < forceList; i++){
			filenames.push(forceList[i]["pic"]);
		}

		var forceCounter = 1; // to be incremented each time through the async.eachSeries
		var attachmentCounter =0;

		async.eachSeries(forceList, function(force, callback){
			var newDoc = {};
			newDoc['doctype'] = "force";
			newDoc['forceName'] = force['name'];
			newDoc['description'] = force['definition'];
			newDoc['int_id'] = forceCounter;
			newDoc['pic'] = "http://127.0.0.1:3000/doc/pattern/"+doc['int_id']+"/force/"+forceCounter+"/"+force['pic'];
		//	newDoc['pic'] = forces['pic'];
			newDoc['parentPattern'] = doc['_id'];
			forceCounter++;
			
			db.insert(newDoc, function(err, body){
				if (err) {
					console.log("error creating new force doc "+err);
				} else {
					// var newdockeys = Object.keys(body);
					// for (var i=0; i < newdockeys.length; i++){
					// 	console.log("newdoc keys "+newdockeys[i]);
					// }
				newForceDocs.push(body.id);
				//console.log("force counter = "+forceCounter+" looking inside forceAttachments "+forceAttachments[forceCounter - 1]['filename']);
				forceAttachments[attachmentCounter]['docid'] = body.id;
				attachmentCounter++;
				callback();
				}
			});

		}, function(err){ //callback for when async.eachSeries is finished
			if (!err){
				console.log("we saved some new forces! but havnt added attachemnts yet");
				for (var i = 0; i < newForceDocs.length; i++){
					console.log(newForceDocs[i]);			
				}
				//callback2(null);
				addAttachments(forceAttachments);
		    } else {
		    	console.log("something wrong with add Forces async "+err);
		    	callback2(err);
		    }//if (!err)
		  } //end final callback function
		);// end putForces async

	//attachedfiles sould be an array of objects, where objects contain doc id: and filename: fields
	var addAttachments = function(attachedFiles){
		async.eachSeries(attachedFiles, function(file, callback){
			//for each item in forceAttachemnts, get the prototype doc attachment and pipe to file['data']
			db.attachment.get(doc.id, file['filename']).pipe(file['data']);
			//get the _rev of the force doc, and write attachemnt
			db.get(file['docid'], function(err, body){
				db.attachment.insert(body.id, file.newfilename, file['data'], file.contenttype, {"rev": body["_rev"]}, function(err, data){
					if (err){
						console.log("probs pipeing in force attachment "+err);
					} else{
						console.log("attachment "+file.filename+" attached");
						callback();
					}
				}); //close db.attachment
			});//close db.get
		}, function(err){
			if (err){
				console.log("somthing wring with addAttachments async "+err);
			} else{
				callback2(null);
			}
		});//close async.eachSeries
	}//close addAttachments
	

	} //end putForces()

//*****************************************************************************

	var putAuthors = function(doc, callback){
		console.log("putAuthors eg- "+doc['author']);
		callback(null);
	}
//*****************************************************************************

	var putReferences = function(doc, callback){
		console.log('need to parse the refs');
		callback(null);
	}
//*****************************************************************************

	var cleanUp = function(doc, callback){
		console.log("we're done!");
		callback(null);

	}
//*****************************************************************************


	var functionList = [putMainDoc, putForces, putAuthors, putReferences, cleanUp];

	//get prototypes and see if :intID exists
	db.get('_design/patterns/_view/getPrototypes', function(err, body){
		if(err) {
			console.log("error getting protopattern list from couch"+err);
			res.sendStatus(500);
		}

		var listOfPrototypes = body['rows'];
				
		for (var x = 0; x < listOfPrototypes.length; x++){
			
			if (String(listOfPrototypes[x]['value']) === intID){ //remember req.prams is a string
			//	console.log("match!");
				db.get(listOfPrototypes[x].id, function(err, doc){
					if (err) console.log("error getting proto doc" +err);
					
					//logic to rangle doc into published versions
					//note we have to retreive the doc again within each function to get a current _rev
					async.applyEachSeries(functionList, doc, function(err, done){
						if (!err) {
							console.log("made it through the list! ");							
							res.sendStatus(200);
						} 
						else{
							console.log("error "+err);
							res.sendStatus(500);
						}
					})

				});
			}
		}
	});

});


//*******************************************
app.post('/new', function(req, res){
//	console.log("hey look, a new pattern!");

	//get a random ID for this POST
	var session = crypto.randomBytes(20).toString('hex');
	var saveTo = "./tmp/"+session;

	var protoPattern = {}; //blank object to store parsed form fields
	//var protoForce = {};
	//var protoRef = {};
	//var protoAuthor = {};
	
	fs.mkdir(saveTo, function(err){
		if(err) console.log(err);
	});

	//remove tmp files
	function tidyUp(callback){
		rimraf("./tmp/"+session, function(err){
			if(err) callback(err);
			callback(null);
		});
	}
	

	//create a new busboy object to stream the req object to
	var form = new busboy({headers: req.headers});

	//define the events to parse/action


	//get the files and save them to /tmp - prefix the filename with "formfield__"
	
	var attachments = []; //also save files as array in mem for sendng to couchdb?

	form.on('file', function(fieldname, file, filename, encoding, mimetype){
		console.log(fieldname+"****"+filename+"***"+encoding);
		file.on('data', function(data){
			//grab all the files and store the deatails an data in array
			attachments.push({"name":fieldname+"__"+filename, "data":data, "content_type":mimetype});
			
			//also write files to ./tmp  <<<<<< can maybe dispense with this >>>>>>>>>>>>>>>
			fs.writeFile(saveTo+"/"+fieldname+"__"+filename, data, function(err){
				if(err) console.log(err);
				console.log("File saved? @ "+saveTo+"/"+fieldname+"__"+filename);
			});	
		});			
	});

	form.on('field', function(fieldname, value, fieldnameTruncated, valTruncated){
		protoPattern[fieldname] = value;
	});

	form.on('finish', function(){
	//	console.log(protoPattern);
		//set additional fields to identify pattern
		protoPattern["doctype"] = "protoPattern";
		//get next int_id
		
		//fetch the number of pattern and protopattern docs - set new int_id to one higher than the highest
		db.get('_design/patterns/_view/getLastIntID', function(err, body){
			//console.log(body.rows.length);
			var listOfResults = body.rows;
			var listOfValues = [];
			for (x in listOfResults){
				listOfValues.push(listOfResults[x].value);
			}
			var newID = Math.max.apply(Math, listOfValues)+1;
			
			//now set the new unique int_id for this pattern
			protoPattern['int_id'] = newID;
		
			//save to db, then add attachemts
			db.insert(protoPattern, function(err, body){
				if(!err) {
					console.log('protopattern saved... now to add attachments...');
				
					//add all the attachments grabbed from form.on('files', ...)
					async.eachSeries(attachments, function(file, callback){
						db.get(body.id, function(err, body2){
							if (!err){
								db.attachment.insert(body.id, file['name'], file['data'], file['content_type'], { "rev": body2['_rev'] }, function(err, body3){
									if(!err) {
								//		console.log("file attached "+file['name']+" to _rev "+body2['_rev']);
										callback();
									} else {
									 console.log("error attaching file "+file+"***"+err);
									}
								});
							} else {
								console.log("error getting newly created doc "+err);
							}
						})
					}, function(err){
						if(err) {
							console.log("something wrong with async");
						} else {
							//remove tmp files , send response >>>technically should be 201, but we are coupled to the front end here, do what makes sense for the user
						//	console.log("tidyUP!");
							tidyUp(function(err){
								if(!err){
									fs.openSync('./tmp/.keep', 'w');
									res.writeHead(302, {"Location": "/created.html"});
									res.end();
								} else {
									console.log("error tydying up "+err);
								}
							
							});
						}
					});  									
				
				}
				else {
					console.log("error saving protoPattern to couch  "+err);
				}
			});
		});					
	});
		
	//pipe the req to be processed
	req.pipe(form);
	
	//pu this inside loop when done to say OK!
	//NB - add call back to index jQuery to redirect/change/update DOM if we get 201.
	//res.writeHead('201', {
	//	"Location": "http://127.0.0.1:3000/"
	//});
	//res.end();
});


//for posting edited protpatterns via alpaca form data - data sent from edit.html
//**************************************************
app.post('/prototype', function(req, res){

	var protoPattern = {}; //blank object to store parsed form fields

	//create a new busboy object to stream the req object to
	var form = new busboy({headers: req.headers});

	//get the files and save them to /tmp - prefix the filename with "formfield__"
	var attachments = []; //also save files as array in mem for sendng to couchdb?

	form.on('file', function(fieldname, file, filename, encoding, mimetype){
		console.log(fieldname+"****"+filename+"***"+encoding);
		file.on('data', function(data){
			//grab all the files and store the deatails an data in array in memory
			attachments.push({"name":fieldname+"__"+filename, "data":data, "content_type":mimetype});
		});			
	});

	// next parse and store all the key/value pairs
	form.on('field', function(fieldname, value, fieldnameTruncated, valTruncated){
		protoPattern[fieldname] = value;
	//	}
	});

	//once done , wrangle and update the protopatten
	form.on('finish', function(){
	//	console.log(protoPattern);
		//set additional fields to identify pattern
		protoPattern["doctype"] = "protoPattern";
		//get next int_id
		
		//fetch the exisitng doc by int_id 
		//first get list of all prototypes
		db.get('_design/patterns/_view/getPrototypes', function(err, body){
			//check for error getting list from db
			if(err) console.log("error getting protopattern list from couch"+err);
		
			var listOfPrototypes = body['rows'];
				
			for (var x = 0; x < listOfPrototypes.length; x++){
		
				if (String(listOfPrototypes[x]['value']) === String(protoPattern['int_id'])){ 
					//	console.log("match!");
					//Get the matching (old) prototype doc if there is a match
					db.get(listOfPrototypes[x].id, function(err, doc){
						if (err) console.log("error getting proto doc" +err);

						//set new doc _rev 
						protoPattern['_rev'] = doc['_rev'];
						protoPattern['_id'] = doc['_id'];
						if (doc['_attachments']){
							protoPattern['_attachments'] = doc['_attachments'];
						} else {
							protoPattern['_attachments'] = {};
						}
						

					//	console.log('adding to db');
					//	console.log(protoPattern);
				
						db.insert(protoPattern, function(err, body){
							if(!err) {
								console.log('protopattern saved... now to add attachments...');
								
								console.log(Object.keys(protoPattern['_attachments']));

								//get list of current attachments
								var oldAttachments = Object.keys(protoPattern['_attachments']);

								//get list of current attachment prefixes
								var oldPrefix = [];
								for (var counter = 0; counter < oldAttachments.length; counter++){
									var holder = oldAttachments[counter].split('__');
									oldPrefix.push(holder[0]);
								}

								//add all the attachments grabbed from form.on('files', ...)
								async.eachSeries(attachments, function(file, callback){
									console.log("inside async for attachment array"+oldPrefix);
									//get prefix of new file['name'] attachement (the one we just POSTed)
									var prefix = file['name'].split('__');
									console.log('prefix[0] ='+prefix[0]);
									//see if newly posted attachments already have a counterpart in the db. 
									

									if ( oldPrefix.indexOf(prefix[0]) > -1 ){
										//then we have a match
										var doomedAttachment = oldAttachments[oldPrefix.indexOf(prefix[0])];
										console.log("$$$$ doomed attachment = "+doomedAttachment);
										console.log("about to replace attachment "+prefix[0]+prefix[1]);
										db.get(body.id, function(err, moardocs){ // wrap this this in a db.get() so _rev is curren
											//console.log("why you no delete "+oldAttachments[index]);
											console.log("deleting attachment"+doomedAttachment);
											db.attachment.destroy(body.id, doomedAttachment, {"rev": moardocs['_rev']}, function(err, anotherbody){
												if (!err) {
													console.log("attchment destroyed"+doomedAttachment);
													//now add attachment
													console.log("now we shoud add the replacement attachment")
													db.get(body.id, function(err, body2){
														if (!err){
															db.attachment.insert(body.id, file['name'], file['data'], file['content_type'], { "rev": body2['_rev'] }, function(err, body3){
																if(!err) {
																	console.log("file attached "+file['name']+" to _rev "+body2['_rev']);
																	callback();
																} else {
												 					console.log("error attaching file "+file+"***"+err);
																}
															});
														} else {
														console.log("error getting newly updated doc "+err);
														}
													}); //closes db.gef
												}
											});
										}); //done deleting and replacing attachment										

										} else { // no mattch - just add attachment
										db.get(body.id, function(err, body2){
											if (!err){
												db.attachment.insert(body.id, file['name'], file['data'], file['content_type'], { "rev": body2['_rev'] }, function(err, body3){
													if(!err) {
														console.log("file attached "+file['name']+" to _rev "+body2['_rev']);
														callback();
													} else {
												 	console.log("error attaching file "+file+"***"+err);
													}
												});
											} else {
												console.log("error getting updated created doc "+err);
											}
										}); //closes db.gef
										}//closes else if no match

								}, function(err){  //closes async function, defines callback
									if(err) {
										console.log("something wrong with async");
									} else {
											res.writeHead(302, {"Location": "/updated.html"});
											res.end();
									   }
								}); //close async callback, and async 
							} //close if

							else {
								console.log("error saving protoPattern to couch  "+err);
							}

						}); //closes db.insert(protoPattern ...)  

					}); //closes second db.get()
				
				} //closes if(String()...)
			
			} //closes for loop

		}); //closes first gb.get()

	}); //closes form.on('finish' ...)

	//pipe the req to be processed
	req.pipe(form);
}); //closes app.post()
		

//*************************************************
//* /publish - takes the :id and wrangles the couchdb doc into final form for linked data.
//**************************************************



//*********************************************
//* /json-new is no longer needed!! delete this route once we are happy with the app.
//*********************************************
app.post('/json-new', function(req, res){
	console.log("were posting to new!");
	//note body-parser should check for valid JSON first.
	//if OK it is parsed into req.body object.

	//copy req.body object to payload
	var payload = req.body;

	console.log(Object.keys(payload));
	for (var x in payload){
		console.log(x);
	}
	res.send(payload);

//	checkPayload(payload);

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


