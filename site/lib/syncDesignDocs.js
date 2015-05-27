// run node syncDesignDocs.js from the lib folder to update/add the views and design docs that we define for couchDB here 
// note relative path to nano module 

var nano = require('../node_modules/nano')('http://127.0.0.1:5984');
var db = nano.use('patterns');

// view to query all the pattern docs in the db - returns a list of doc _id and int_id values
var views = {
	_id: '_design/patterns',
	language: 'javascript',
	'views': {
		'getPatternByNum': {
			"map": "function(doc){ if(doc.doctype==='pattern' && doc.int_id){ emit('int_id', doc.int_id);}}"
		},
		'getProtoPatternByNum': {
			"map": "function(doc){ if(doc.doctype==='protoPattern' && doc.int_id){ emit('int_id', doc.int_id);}}"
		},
		'getForceByNum': {
			"map": "function(doc){ if(doc.doctype==='force' && doc.int_id){ emit('int_id', doc.int_id);}}"
		},
		'getRefByNum': {
			"map": "function(doc){ if(doc.doctype==='evidence' && doc.int_id){ emit('int_id', doc.int_id);}}"
		},
		'getLastIntID': {
			"map": "function(doc){ if(doc.doctype==='pattern' || doc.doctype==='protoPattern'){ emit('int_id', doc.int_id);}}"
		},
		'getPrototypes': {
			"map": "function(doc){ if(doc.doctype==='protoPattern'){ emit('int_id', doc.int_id);}}"
		},
		'getPatterns': {
			"map": "function(doc){ if(doc.doctype==='pattern'){ emit('int_id', doc.int_id);}}"
		},
		'getExemplars': {
			"map": "function(doc){ if(doc.doctype==='exemplar'){ emit('_id', doc._id);}}"
		}

	}
};

// view to get a single pattern doc by name
//var singlePattern = {
//	_id: '_design/singlePattern',
//	language: 'javascript',
//	'views': {
//		'singlePattern': {
//			"map": "function(doc){ ifemit(doc)}"
//		}
//	}
//};

//var designDocs = [allPatterns]

//first get the desgin doc and grab the rev
//NB assumes the design doc already exists!!!
//TODO - handle create if not exist.
var getRev = db.get("_design/patterns", function(err, body){
	// if not error - 
	if (!err){
		console.log('_design/patterns doc exists with... _rev: '+ body['_rev']);
		//double check that body['_rev'] exists
		if (body['_rev']){
			//set _rev on patternDesignDoc specfied above to current _rev we just fetched
			views['_rev'] = body['_rev'];
			//console.log("hi mum"+patternDesignDoc['_rev']);
			
			//update existing design doc
			db.insert(views, '_design/patterns', function(err, body){
			if (!err){
				console.log("Design docs updated!");
			} else {
				console.log(err);
			  }
		    });
	    }
		
	}
});

//console.log("pattern doc outsie the db.get"+patternDesignDoc['_rev']);

//add the rev to the design doc specified above
//if (getRev['_rev']){
//	patternDesignDoc['_rev'] = getRev['_rev'];
//	console.log("hi mum");
//};

