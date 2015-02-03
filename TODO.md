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

rewrite pattern ontology - 2 classes - Pattern, Force + properties 					yep

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
getting and combining docs from the db via nano and connect-rest....				yep - use async.js

check control flow issues with contributor route...!!!(related to above)			yep - implemented counter

give syncDesignDocs.js the same treatment as syncContextDocs.js

get /pattern/contributor/:orcid - 404s, content type, and serve 					404 implemented
proper content type.

POST /pattern/conributor - as test run for POSTing a whole pattern
//prob delete this route later - only edit authors via whole pattern to
simplify client.

move hyperPatterns.js apicontext setting from /api to / - put api in hostname?		no longer needed - switched to express

document 1:n modelling pattern>forces, author>patterns, pattern>reference

does JSON.stringify bugger up patterns or JSON objects where value text
has single/double quotes etc?

JSON-LD for patterns/contributors/:orcid - does it need an @id? it starts			added in for now..
with a blank node according to JSON-LD playground....

assert that pattern/contributor/:orcid is a person?									yes - and Nope - because it isn't

fix JSON.parse check on /contributor POST

add check to see if route :variables are the right type before hitting the database

GET /patterns/contributor/:orcid route - db schema has changed - write view and function
to get and match 'doctype': "contributor" by "ORCID": "http://orchid/:orcid"...

clean final pattern JSON of internal dbfields for each function in 
app.get('patterns/:num') route

resource template URLs hardcoded in app.get('patterns/:num')

catch general 404s for random URL strings that dont match...

change hardcoded URLs for dynamically adding "@id" and "@type" 
to response JSON-LDs in each route

Pattern ontology - current declares that a person (contributor) is part of 
a design pattern _ this not the intended semantics									YEP!

refactor - many functions are written inline and parts are duplicated
create an array of general functions (eg get by int_id) and put in main scope..
eg
- cleanCouchDBFields(object)
- addContext(listOfContexts)
- ...


manually add whole pattern into couch so tests look pretty							YEP

sanitize POST requests before doing anything with them

use json-ld library to process final JSON-LD response 
- will it remove non-LD and unused contexts?

add additional info to JSON-LD response for
/patterns/contributor
	- list of patterns
/pattern/:num/force/:num
	- explicit parent pattern (shouldn't rely on URL semantics)
/patterns/:num/evidence/:num
	- explicit parent pattern - as above
(note we must also think about the context docs and semantics here too)
doing the above makes these resources proper linked data.

implement pattern versioning.
change routes so that
/patterns/integer - gets latest version
/patterns/interger_integer gets specific version.
(/patterns) should also get list of all latest versions...

draw-up and document a versioning schema

draw the schemas, links, actions that are needed to keep everything in track

figure a mechanism/convention for POSTing new and updated patterns

write the db views to retreive and emit, ID, doc_id, _rev...

sanitise or check params on all GET routes

ensure JSON strings are cleaned and sanitised before POSTing - eg remove /n etc

test POSTing garbage to make sure it's handled properly - implement error handling		YEP - kinda - if body-parser fails we catch and return 400 bad request



