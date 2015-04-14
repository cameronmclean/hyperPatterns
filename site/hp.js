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

//****************************************
//* Routes for web front-end
//*****************************************


//****************************************
app.get('/prototypes', function(req, res){
	//query the db for an array of prototype objects
	db.get('_design/patterns/_view/getPrototypes', function(err, body){
		
		var listOfPrototypes = body['rows'];
		var titles = [];
		console.log(listOfPrototypes);
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

//********************************
//app.get('/new', function(req, res){
//
//	console.log("yay! someone is requesting a new pattern!");
//
	//get the new/blank schema from the db, change a few fields and send.
	//note = changes to the template 'patternSchema' doc are set in the helper script syncSchemaDocs.js
//	db.get('alpaca', function(err, body){
//		if (!err) {
//			delete body['_id'];
//			delete body['_rev'];
//			//body['doctype'] = 'newpattern';
//
//			res.send(body);
//			
//		}
//		else
//		{
//			res.sendStatus(500);
//		}
//	});
//});


//********************
app.post('/new', function(req, res){
	console.log("hey look, a new pattern!");

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
										console.log("file attached "+file['name']+" to _rev "+body2['_rev']);
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
							console.log("tidyUP!");
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
	});

	//once done , wrangle and update the protopatten
	
	//
	// TODO - implement attachment copy/comapre logic
	//
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
				
						db.insert(protoPattern, function(err, body){
							if(!err) {
								console.log('protopattern saved... now to add attachments...');
				
								//add all the attachments grabbed from form.on('files', ...)
								async.eachSeries(attachments, function(file, callback){
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
											console.log("error getting newly created doc "+err);
										}
									}); //closes db.gef
								}, function(err){  //closes async function, defines callback
									if(err) {
										console.log("something wrong with async");
									} else {
											res.writeHead(302, {"Location": "/updated.html"});
											res.end();
										}
								}); //closes callback and async.each()									
							}
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


