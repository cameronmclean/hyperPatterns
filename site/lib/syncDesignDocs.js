// run node syncDesignDocs.js from the lib folder to update/add the views and design docs that we define for couchDB here 
// note relative path to nano module 

var nano = require('../node_modules/nano')('http://127.0.0.1:5984');
var db = nano.use('patterns');

// view to return all the pattern docs for a /patterns/ GET
var patternDesignDoc = {
	_id: '_design/patterns',
	language: 'javascript',
	'views': {
		'getAllPatterns': {
			"map": "function(doc){emit(doc)}"
		}

	}

} ;


//first get the desgin doc and grab the rev
//NB assumes the design doc already exists!!!
//TODO - handle create if not exist.
var getRev = db.get("_design/patterns", function(err, body){
	// if not error - 
	if (!err){
		console.log('_design/patterns doc already exists... _rev: '+ body['_rev']);
		//double check that body['_rev'] exists
		if (body['_rev']){
			//set _rev on patternDesignDoc specfied above to current _rev we just fetched
			patternDesignDoc['_rev'] = body['_rev'];
			//console.log("hi mum"+patternDesignDoc['_rev']);
			
			//update existing design doc
			db.insert(patternDesignDoc, '_design/patterns', function(err, body){
			if (!err){
				console.log("Design docs updated!");
			}

			else {
				console.log(err);
			};
		});
	};
		
	};
});

//console.log("pattern doc outsie the db.get"+patternDesignDoc['_rev']);

//add the rev to the design doc specified above
//if (getRev['_rev']){
//	patternDesignDoc['_rev'] = getRev['_rev'];
//	console.log("hi mum");
//};

