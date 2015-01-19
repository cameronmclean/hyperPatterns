// run node syncContextDocs.js from the lib folder to update/add the context docs that we specify here 
// note relative path to nano module 

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
	"url": "http://purl.org/spar/fabio/hasURL",
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
//note that pattern represenations will include contributor, evidence, force docs
var patternContext = {
	"_id": "pattern",
	"doctype": "context",
	"@context": {
	"name": "http://schema.org/name",
	"context": "http://purl/ontology/lp#hasContext",
	"problem": "http://purl/ontology/lp#hasProblem",
	"force": { "id": "http://purl/ontology/lp#hasForce",
				"@type": "@id"
			},
	"solution": "http://purl/ontology/lp#hasSolution",
	"rationale": "http://purl/ontology/lp#hasRationale",
	"diagram": "http://schema.org/diagram",
	"evidence": { "@id": "http://purl.org/spar/cito/citesAsEvidence",
				  "@type": "@id"
				},
	"author": { "@id": "http://purl.org/dc/terms/creator",
				"@type": "@id"
			},
	}
};

// specifies the @contex json to be included / mapped to force docs
var forceContext = {
	"_id": "force",
	"doctype": "context",
	"@context": {
	"forceName": "http://schema.org/name",
	"description": "http://purl.org/dc/terms/description",
	"pic": "http://xmlns.com/foaf/0.1/depiction"
	}
};

//first get the desgin doc and grab the rev
//NB assumes the design doc already exists!!!
//TODO - handle create if not exist?
var getRev = db.get("bibTEX", function(err, body){
	// if not error - 
	if (!err){
		console.log('bibTEX context doc exists with... _rev: '+ body['_rev']);
		//double check that body['_rev'] exists
		if (body['_rev']){
			//set _rev on patternDesignDoc specfied above to current _rev we just fetched
			bibTEXContext['_rev'] = body['_rev'];
			
			//update the existing context doc
			db.insert(bibTEXContext, 'bibTEX', function(err, body){
			if (!err){
				console.log("bibTEX context doc updated!");
			}

			else {
				console.log(err);
			}
		    });
	    }
		
	}
});
