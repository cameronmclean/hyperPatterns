##TODO

####Task/reseach topic																DONE?
how to template POSTs for JSON(-LD)

fill out design sheet
	- write state diagram
	- design representations 
	- map to couch docs
	- node.js glue

bibJSON
	- .tolowercase() when reading in bibTEX to JSON (for the JSON KEYS)
	- will also need to deal with citekey to make it a node.

refactor "evidence" or create new field to allow URLs+descripions for 
non-bibTEX resources (eg videos, blogs, stackexchange answers)...					wont fix - just use bibTEX @online, and URL: "", Date: "" etc...

rewrite pattern ontology - 2 classes - Pattern, Force - properties 

add to context docs, @type and @id for property values that should be 				yep - but double check
dereference

publish pattern ontology - set up server with content negotiation,
- ttl, rdf/XML, 303 HTML

add DesignPattern, Force, Reference, Contributor to @contex docs					yep

slugs for authorID and refID in patterns/... 
resource URL - author - ORCID number, bibTEX - numeric /1, /2 etc?

firm up consistent terminology
evidence, reference, author, contributor etx..

how to handle pictogram resources

handling deletes and edits - rollback strategies so I can undo 
malicious users or noobs mistakes.
(eg a delete request to the API - doesnt delete from the database) 

variable scope, closures, async, callbacks.
something about the event driven nature is doing my head in re:
getting and combining docs from the db via nano and connect-rest....

check control flow issues with contributor route...!!!(related to above)			yep - implemented counter

give syncDesignDocs.js the same treatment as syncContextDocs.js

get /pattern/contributor/:orcid - 404s, content type, proper function

POST /pattern/conributor - as test run for POSTing a whole pattern
//prob delete this route later - only edit authors via whole pattern to
simplify client.

move hyperPatterns.js apicontext setting from /api to / - put api in hostname?

document 1:n modelling pattern>forces, author>patterns, pattern>reference
