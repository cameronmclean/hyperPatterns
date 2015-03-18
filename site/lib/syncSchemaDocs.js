// run `node syncSchemaDocs.js` from the lib folder to update/add the schema docs that we specify here 
// note the relative path to nano module from where this doc is stored.
// currently this script requires the context docs to already exist in couchdb 
// if creating/defining a brand new schema doc - use futon or curl to create an otherwise empty doc with the needed "_id" first.

var nano = require('../node_modules/nano')('http://127.0.0.1:5984');
var db = nano.use('patterns');

// specifies the blank json to be sent when GETing /patterns/new 
var newPatternSchema = {
	"_id": "patternSchema",
	"doctype": "schema",
	"int_id": null,
	"name": "",
	"pic": {"b64encoding": "",
		"filename": ""
	},
	"author": [{
		"ORCID": "",
		"name": ""
	}],
	"context": "",
	"problem": "",
	"force": [{
		"name": "",
		"description": "",
		"pic": {
			"b64encoding": "",
			"filename": ""
		}
	}
	],
	"solution": "",
	"rationale": "",
	"diagram": {
		"b64encoding": "",
		"filename": ""
	},
	"evidence": [ {}
	],
};
var alpaca = {
	"_id": "alpaca",
	"schema": {
		"title": "Create a new Pattern!",
		"type": "object",
		"properties": {
 			"title": {
				"type": "string",
				"title": "Title"
			},
		"image": {
			"type": "string",
			"title": "Select an image to upload..."
 			}
        }
     }
 };

//schema for vaidating POST to new or PUT to /prototype
var validationSchema = {
	"_id": "newPatternValidationSchema",
	"doctype": "schema",
	"$schema": "http://json-schema.org/schema#",
	"title": "New pattern validation schema",
	"type": "object",
	"items": {
		"type": "object",
		"properties": {
			"doctype":{
				"type": "string"
			},
			"name": {
				"type": "string"
			},
			"pic": {
				"type": "object"
			},
			"author": {
				"type": "array"
			},
			"context": {
				"type": "string"
			},
			"problem": {
				"type": "string"
			},
			"force": {
				"type": "array"
			},
			"solution": {
				"type": "string"
			},
			"rationale": {
				"type": "string"
			},
			"diagram": {
				"type": "object"
			},
			"evidence": {
				"type": "array"
			}
		},
		"required": ["doctype", "name", "pic", "author", "context", "problem", "force", "solution", "rationale", "diagram", "evidence"]
	}
};



var schemaDocs = [newPatternSchema, validationSchema, alpaca];

//note this function uses an Immediately Invoked Function expression to 
// allow async call-back funtions to close properly within the 
// for loop. see
// http://stackoverflow.com/questions/750486/javascript-closure-inside-loops-simple-practical-example/19323214#19323214
// http://learn.jquery.com/javascript-101/functions/#immediately-invoked-function-expression-iife
// http://en.wikipedia.org/wiki/Immediately-invoked_function_expression

function syncDocs() {
	for (var x = 0; x < schemaDocs.length; x++) {
		//IIFE - anon function will be called on each iteration of the for loop
		// we pass in the value of for loop x as index within the anon funct 
		(function(index){
			//we copy the contents of the JSON objects specified above into the temp var doc here
			var doc = JSON.parse(JSON.stringify(schemaDocs[index]));
			//retreive the doc from couch db
			db.get(doc['_id'], function(err, body){
				if(!err){
					//if OK, set/create temp doc "_rev" field to match current db rev
					doc['_rev'] = body['_rev'];
					//write the doc
					db.insert(doc, function(err, body){
						console.log(body);
					})
				}
				else{
					// if the db.get fails
					console.log(err);
				}
				//console.log("doc id is "+doc['_id']+" and doc rev is set to "+doc['_rev']);
			})
		})(x); // we send the for loop iterator x to the (IIFE) anon function above, where it is defined as 'index' 
			   // see IIFE links above
	}
}


syncDocs();
