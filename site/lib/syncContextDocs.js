// run `node syncContextDocs.js` from the lib folder to update/add the context docs that we specify here 
// note the relative path to nano module..
// currently this script requires the context docs to already exist in couch 
// if creating/defining a brand new context doc - use futon or curl to create an otherwise empty doc with the needed "_id" first.

var nano = require('../node_modules/nano')('http://127.0.0.1:5984');
var db = nano.use('patterns');

// specifies the @contex json to be included / mapped to bibTEX docs
var bibTEXContext = {
	"_id": "bibTEX",
	"doctype": "context",
	"@context": {
	"address": "http://schemas.talis.com/2005/address/schema#localityName",
	"author": "http://purl.org/dc/terms/creator",
	"booktitle": "http://purl.org/dc/terms/title",
	"chapter": "http://purl.org/ontology/bibo/chapter",
	"doi": "http://purl.org/ontology/bibo/doi",
	"edition": "http://purl.org/ontology/bibo/edition",
	"editor": "http://purl.org/ontology/bibo/editor",
	"entrytype": "http://purl.org/net/nknouf/ns/bibtex#Entry",
	"journal": "http://schemas.talis.com/2005/address/schema#localityName",
	"month": "http://purl.org/net/nknouf/ns/bibtex#hasMonth",
	"number": "http://purl.org/net/nknouf/ns/bibtex#hasNumber",
	"pages": "http://purl.org/net/nknouf/ns/bibtex#hasPages",
	"publisher": "http://purl.org/dc/terms/publisher",
	"series": "http://purl.org/net/nknouf/ns/bibtex#hasSeries",
	"title": "http://purl.org/dc/terms/title",
	"url": {"@id": "http://purl.org/spar/fabio/hasURL",
		"@type": "@id"
		},
	"volume": "http://sw-portal.deri.org/ontologies/swportal#isVolume",
	"year": "http://purl.org/spar/fabio/hasPublicationYear"
	}
};

// specifies the @contex json to be included / mapped to contributor (author) docs
var contributorContex = {
	"_id": "contributor",
	"doctype": "context",
	"@context": {
	"ORCID": { "@id": "http://purl.org/spar/scoro/hasORCID",
			   "@type": "@id"
			 },
	"authorName": "http://xmlns.com/foaf/0.1/name"
	}
};

// specifies the @contex json to be included / mapped to pattern docs 
//note that pattern represenations served by the API will include contributor, evidence, force docs
var patternContext = {
	"_id": "pattern",
	"doctype": "context",
	"@context": {
	"name": "http://schema.org/name",
	"context": "http://purl/ontology/lp#hasContext",
	"problem": "http://purl/ontology/lp#hasProblem",
	"force": "http://purl/ontology/lp#hasForce",
	"solution": "http://purl/ontology/lp#hasSolution",
	"rationale": "http://purl/ontology/lp#hasRationale",
	"diagram": "http://schema.org/diagram",
	"evidence": "http://purl.org/spar/cito/citesAsEvidence",
	"author": "http://purl.org/dc/terms/creator",
	}
};

// specifies the @contex json to be included / mapped to force docs
var forceContext = {
	"_id": "force",
	"doctype": "context",
	"@context": {
	"forceName": "http://schema.org/name",
	"description": "http://purl.org/dc/terms/description",
	"pic": {"@id": "http://xmlns.com/foaf/0.1/depiction",
	"@type": "@id"
	 	}
	}
};

var contextDocs = [bibTEXContext, contributorContex, patternContext, forceContext];

//note this function uses an Immediately Invoked Function expression to 
// allow async call-back funtions to close properly within the 
// for loop. see
// http://stackoverflow.com/questions/750486/javascript-closure-inside-loops-simple-practical-example/19323214#19323214
// http://learn.jquery.com/javascript-101/functions/#immediately-invoked-function-expression-iife
// http://en.wikipedia.org/wiki/Immediately-invoked_function_expression

function syncDocs() {
	for (var x = 0; x < contextDocs.length; x++) {
		//IIFE - anon function will be called on each iteration of the for loop
		// we pass in the value of for loop x as index within the anon funct 
		(function(index){
			//we copy the contents of the JSON objects specified above into the temp var doc here
			var doc = JSON.parse(JSON.stringify(contextDocs[index]));
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
