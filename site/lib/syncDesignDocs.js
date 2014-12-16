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
			"map": "function(doc){emit(doc.name, doc)}"
		}

	}

} ;

db.insert(patternDesignDoc, '_design/patterns', function(err, body){
	if (!err){
		console.log("Design docs updated!");
	}

	else {
		console.log(err);
	};
});