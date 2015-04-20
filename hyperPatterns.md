hyperPatterns
-------------

Notes on getting running with Node.js express etc for making a hypermedia API and web app for lab patterns

1) Dir structure for node apps
use /Projects/hyperPatterns/site for the app and keep related project notes, docs etc in the parent /hyperPatterns dir

2) run `npm init` in hyperPatterns/site to have npm manage project dependencies and metadata about the project

3) run `npm install --save express` to add the express framework to our node app. the --save will add metadata to package.json packages are saved in node_modules dir. You can .gitignore this dir 

4) with routing in express `app.VERB('/path', function(req, res){...});` VERB is the http method or other express catch-all, and _order matters_ eg a route `'/about*'` before `/about/contact'` means that the request/response for the route '/about/contact' will never get called.

5) serving static files - create a ..site/public directory which can contain ./img, ./css, ./js etc dir, and express middleware can serve them by specifying `app.use(express.static(__dirname + '/public'));` . In templates (eg handlebars) we can reference static files by "/img/logo.png" etc . //NOTE - i won't/cant use handlebars if im using Angular.js and an node/express API

6) create modules in ./lib  - in the library code use `exports.myNewFunction = function(){...};` to ensure functions are available outside of the module. Make sure to `var exampleLib = require('.lib/myExampleLib.js');` at the top of your node app.js - call module function like e.g. `exampleLib.myNewFunction();` etc.

7) use `npm install --save-dev packagename` to install a package that is only used during dev - eg unit testing - these are development dependencies, not runtime dependencies.

8) vhost package - allows routing from subdomains.

9) Need cors `npm install --save cors` to enable cross-origin resource sharing `app.use('/api', require('cors')());`

10) Use connect-rest `npm install --save connect-rest` to create APIs
//> NB not useing connect-rest at the moment - plain old express :)


#####20141215
Started using [connect](https://github.com/senchalabs/connect), and [connect-rest](https://github.com/imrefazekas/connect-rest) with [nano](https://github.com/dscape/nano#dbinsertdoc-params-callback) to create a node server for the api.

Things to think about...
1) API paths, methods, payloads for each state transition
2) where will content be marked up into LD/RDF? server, database or client? 
3) modeling patterns as RDF/JSON-LD - we start with the JSON-LD that we eventually want, and then implement the server and DB to marshal various documents and resources to produce this content. 

??

Linked data platform primer...
1) establish a basic container - eg http://api.patterns.org/patterns
we should be able to read this root document and discover the affordances
i.e it should return JSON-LD/Hydra that describes the list of patterns we can GET, and the option to POST a new one.

??

PATH                             METHOD         DESCRIPTION

/patterns/		                 GET            List all the patterns
				                 POST           Create a new pattern

/patterns/{name}/				 GET            List the pattern elements and forces
								 POST			Create a force
								 PUT			Update the pattern
								 DELETE         Delete the pattern

/patterns/{name}/{{force}}/      GET            List the force properties
								 PUT			Update the force
								 DELETE         Delete the force

/\*/\*     				         OPTIONS
				 				 HEAD

>>nb not sure if above will work - nested basic containers?

---
Created lib folder. First script is syncDesignDocs.js which specifies all the design docs we want to use/store in couchDB. Running `node syncDesignDocs.js` from the hyperpatterns/site/lib dir will write the docs to couchdb /patterns/_design etc...

######20141216
When doing couch db doc updates - need to read in whole doc, make changes and PUT back. The '_rev' must be present and same as current rev in order to prevent a update clash.

A PUT to a doc with matching _revs is accepted, and the resultant doc gets a new _rev.

I wrote some hacky/inelegant code to get the current _design/patterns doc, extract the _rev, and append it to the defined docs in syncDesignDocs.js - currently it assumes the design doc already exists.

#####20141217
Some design considerations - we could store three types of docs in couchdb - pattern doc, force doc, @context doc. (perhaps also a fourth author doc? and a fifth bibJSON doc?). This allows us to separate the "content" which can be wrapped in an RDF "contex" at query time and allows content and context to be decoupled, creating ease of maintenance and development. when an api call is received by node, the server is responsible for calling couchdb _views _displays _lists etc, which marshal and join the appropriate docs, - where couchdb joins or views are difficult, we can combine multiple db views in node and perform additional processing to formulate the appropriate response. This might be (relatively) straight-forward for GETing data, but perhaps it makes sense to decide docuemnt boundaries for easy POST/PUTing of data - the node server and middleware will be responsible for parsing these requests into the appropriate JSON strucutres for insertion into couchdb. 

Design decision - we should put all the event and update handling, mulitdocument validation etc in the node app.This means if we later want a different doc store, we only have to refactor/change code in (mostly)one place. 

Also - the decision to separate the @contex - means we can create clean, plain JSON at the flick of a switch.

#####20141218
Started on creating separate @contex .json docs for various components of patterns - authors, pattern body, forces and bibTEX/JSON references. These contexts can be appended to representations by node.js middle ware as required and added as an array "@context": ["http://patterns.org/context/bibTEX.json", "http://patterns.org/context/forces.json"] etc...

started on bibTEX.json as a context to wrap bibTEX files that are parsed as/into JSON. bibTEX.json is a mapping for the typical bibTEX keys. 
Note JSON-LD is case sentive, while bibTEX is not - therefore remember to implement a .tolowercase() when parsing in bibTEX to JSON. *only for the resulting (bib)JSON KEYS*
plan on using this bibTEX to JSON library for node.js - https://www.npmjs.com/package/bibtex-parser-js

The list of bibTEX fields to match to vocabs was taken from wikipedia [here](http://en.wikipedia.org/wiki/BibTeX).

NOTE: the need to avoid name collisions in @contexts - eg "name:" and "title" - may be for journal, person, pattern, force etc... perhaps pre-pend potential collisions with something like patternName: patternAuthor: forceName: etc... 


Note: as far as possible we have tried to use SPAR ontologies (http://sempublishing.sourceforge.net/) but there are still gaps - we resort to using the older http://zeitkunst.org/bibtex/0.1/ bibREX in OWL vocab as it maintains the closes semantics. 

#####20141219
Created syncContextDoc.js in site/libs - where we define @context docs to be stored in couchdb. they they have the "\_id" : _name of context_ and a "doctype": "context" . Note - we need to manually create a context doc at localhost:5984/patterns/ with the appropriate custom "_id" via futon first, then we can run `node syncContextDocs.js` to get a _rev and add all the details specified in the syncContextDocs.js 


---
we use the generic schema.org "name" for both name of pattern, and name of force - this has broader semantics than existing dc terms like "title" etc which may have implicit pragmatic differences amongst different communities. The choice of 'name' rather than 'title' reflects our view of patterns as 
functional and active, rather than passive literary constructs. 

Note - our pattern ontology to describe the parts of pattern not covered with existing vocabs - the classes we define, correspond to the resources we identified in the API design - they are both things we need to give IRIs to. (of course we need to mint IRIs for the novel pattern properties too)

created v0.2 of the pattern ontology - we now have 4 Classes - DesignPattern, Force, Contributor, Reference
and properties - hasProblem, hasContext, hasSolution, hasRationale, and hasForce  

######20150120

2015 and we're back!

tweaked syncContextDocs.js to include the latest semantic mapping for Pattern, Force, Contributor, and Reference docs.
Spent ages stuck on getting the nano couchdb get() and insert() functions to work properly within a for loop, iterating through the context
docs to get a _rev and insert the latest. This was due to variable hoisting within nested functions and iterator/variable scope.

final solution was the following - see links 
 http://stackoverflow.com/questions/750486/javascript-closure-inside-loops-simple-practical-example/19323214#19323214
 http://learn.jquery.com/javascript-101/functions/#immediately-invoked-function-expression-iife
 http://en.wikipedia.org/wiki/Immediately-invoked_function_expression


```javascript
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
			//retrieve the doc from couch db
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
``` 
   
#####21050121

OK - sorting out getting information back out of callback functions returned when we make db.get() etc calls using nano within a connect-rest app.get() route..(for example)

Problem was, I was misunderstaning Ajax
http://community.sitepoint.com/t/how-to-update-globale-variable-from-within-a-callback-function/12621/2

The main js code doesnt wait for the db.get() call to finish before moving on to the next thing.
The solution is to write another function within the scope (higher) of all the db calls we need to marshal, and then call that upon the db.get() _etc_ callback function execution....
This keeps the variables we want within the right function scope.

_that solved half the problem_

The other problem - we need integrate the various async calls in the final step to assemble and emit a proper JSON-LD representation assembled from the various couchdb docs.
The only real way to do this, without going down nested callback hell, is to implement a counter.
After each async request/callback is run, it updates a counter. we then check the counter to see if the expected number of async functions have completed, and if so, execute a final done() function, which can assume the shared variables manipulated by different async functions are now in their final state. NOTE - there are various ways to do this - mine is somewhat hard coded at the moment (but at least commented)
see http://stackoverflow.com/questions/855904/javascript-synchronizing-after-asynchronous-calls?rq=1

And also, a new slightly annoying feature/bug I noticed today
docs in couchdb are correctly stored with keys and values "double quoted"
eg

```
{"_id":"contributor","_rev":"3-43aad752c0316729b0d6ee975c039956","doctype":"context","@context":{"ORCID":{"@id":"http://purl.org/spar/scoro/hasORCID","@type":"@id"},"authorName":"http://xmlns.com/foaf/0.1/name"}}
```
but getting it from nano, within node,js and printing it to console.log() 
eg
```
db.get(docID, function(err, body){
	console.log(body);
});
```

gives 

```
{ _id: 'contributor',
  _rev: '3-43aad752c0316729b0d6ee975c039956',
  doctype: 'context',
  '@context':
   { ORCID: { '@id': 'http://purl.org/spar/scoro/hasORCID', '@type': '@id' },
     authorName: 'http://xmlns.com/foaf/0.1/name' } }
```

?? asked on gitter (chat forum for nano via github) - had all sorts of issues editing within dialog box so request for help came out garbled.
we'll see if anyone can make sense of what I meant... :-/

Added jsonld https://github.com/digitalbazaar/jsonld.js
by
`sudo npm install --save jsonld` from /hyperPatterns/site dir
and
`var jsonld = require('jsonld');` in main hyperPatterns.js

next to refactor /patterns/contributor/:orcid wrangleMainDoc() and wrangleContextDoc() to use jsonld functions.
checked out new branch jsonld - had a hack but no success - jsonld.compact() wouldnt return a merged doc, only the context....

skipped back to master.
discovery
using `JSON.stringify(doc, null, 2)` on docs prettyfies them nicely and the console.log(doc) now validates as proper JSON-LD.
happy for now, but wondering if the later whole pattern stringify will get messed up with "" or '' within the text of a pattern doc...???
I know JSON.stringify can mess with datetime and other JSON standards....

#####20150122

OK - so added an extra goToError() function, that returns a string indicating the error (eg 404) from trying to get a *couchdb doc* - that is to say - when we dereference /patterns/contributor/:orcid, if the value of :orcid does not map to a couchDB doc, we return the error back to the client. a 404 from couchdb also means a 404 from the pattern api - i;ve aligned the implementation deatails with the API service here, i.e i'm assiming for now that an API request for a contributor equates to a couchdb GET on the conributor doc. this is not best practice or very good error handling, but it will suffice for now - better than a silent or no response. 

I got the API to return properly formatted JSON-LD to the client - used a callback in the original 
rest-connect rest.get(/path). this callback is initiated when the final done() function is called, and passes the doc back...

 i.e 

 ```javascript
 est.get('/patterns/contributor/:orcid', function(request, content, callback){

		
	var urlParams = request.parameters; //get parameters from request
	var docID = urlParams['orcid']; // get orcid for doc retrevial 
	console.log("request for pattern contributor with author ID "+docID);

	
	var doc = {}; //to store the final structure that will be returned
	var progress = 0; //a counter to mark number of async requests

	// to be called when all async requests to coucdb and responces have been marshalled
	function done(){

		console.log('this is the final doc!');
		console.log(JSON.stringify(doc, null, 2));
		callback(null, doc);
		//TODO - add code to push doc to HTTP response with appropriate headers
	}

//etc ..
```

I also added a new field in the returned JSON-LD to make a reference ("@id") of the resource being described.
Not sure if this is necessary yet - but it prevents blank nodes in the n-tripleization of the JSON-LS document. 

we add this in the wrangleMainDoc() function of the rest.get('/patterns/contributor/:orcid') route.
`doc['@id'] = "http://api.patterns.org/contributor/"+docID;`

cant get rest.post to work!
cant access the content part of the POST - is undefined.
Request object has all sorts, but not the json payload.
callback is a function that takes err, result, and resOptions argument...
found this for finding the params for a function..

```
	var reg = /\(([\s\S]*?)\)/;
		var params = reg.exec(callback);
		if (params) 
     	var param_names = params[1].split(',');
     	console.log(param_names);

```

but otherwise meh. try again tomorrow...

#####20150123
ALRIGHTY!

So, ended up ditching connect, connect-rest - keep hyperPatterns as simple Node, express app.
created new branch - express to try again - will merge/overwite master when its working
Solved issues relating to POST body

1) - need to use middleware - body-parse
`npm install --save body-parse`
add to *hp.js* (the new main app name for now)

```
var bodyParser = require('body-parser');
app.use(bodyParser.json());
```

getting at the POST body is now as easy as req.body ...

```
app.post('/patterns/contributor', function(req, res){
	
	var payload = JSON.stringify(req.body, null, 2);
	console.log(payload);
	
	if (JSON.parse(payload)){
		console.log("Looks legit");
		res.send("OK!");
	}
	else{
		res.send("Please submit valid JSON");
	}
	
});
```

####20150125
OK - so put in a proper 404 error handling response for /patterns/contributor/:id 
if :orcid doc cant be retreived from couch, we goToError()
and res.sendStatus(404);


SO - now working on a GET route that will return an entire pattern.
This is tricky - requires to think about how to store, reference and marshal all the docs,
and how to key /patterns/:name to identify and fetch data base docs.
when is a pattern stull the same pattern?
i.e we use a slug to crate english type url names - "pigment-extraction", then say we later change the pattern
name to 'dye extraction' - but the url still says "pigment" etc - it gets confusing.
or we can use patters/:number - the number stays constant through multiple edits...
this way we always talk about / identify the same pattern, although its details and properties will change through time.
I think the second strategy is better... we could expose a pattern version number? 

So - one probably good enough strategy for now...
http://stackoverflow.com/questions/5073343/approaches-to-generate-auto-incrementing-numeric-ids-in-couchdb
- when *pattern* docs are created, keep the couchdb UUID for _id
- create "docytype" and "int_id" fields, we can use these for lookup of a single doc.
- when saving new patterns, do a query (map and reduce) to _count the number of docs (=used integers) and 

Note : as the stackexcahnge post says, this approcah always has us tied to a permanantly broken naming model.
In my case, it's only broken if we later use the replication and distributed couchdb fucntions - which we wont..

...
SO - added a db view (design) doc that retreives all docs of type "pattern" and that have a "int_id" field.
it emits a list of objects, with "id", "key", and "value" fields of mathching docs.

1 we then grab the :num from the route
2 grab the list of pattern docs with int_id
3 go thorugh the list to see if :num has a match in the document list
4 if so - grab the whole doc
5 if not, (the for loop is exhaused with no match), go to 404 error

--
getting a list of forces and wrangling them into one JSON-LD
is tricky - we cant have lists of list or sets of sets ...
use @graph?
embeddign?


--
gah - still having trouble breaking out of callbacks, passing variables and mustering all the docs
code to get list of pattern forces, make a db.get() call for each force doc id still not working...
too tired, need fresh eyes/brain...

####20150126
ALrighty. So figured it out (kinda)
Use async.js !
https://github.com/caolan/async
http://justinklemm.com/node-js-async-tutorial/
http://www.sebastianseilund.com/nodejs-async-in-practice

the documentation is a little terse, but I got it working in short time..

instead of messing about with nested anon functions and callbcak hell - used async.each()
- takes three arguements - 
1 a list of items to iterate through (in our case the list of force doc _ids - listOfForces)
2 a function that wraps the async function we want to call - takes a single item (force) and a callback
3 the final function to call (takes err if occured during iteration function)


```javascript
	function getPatternForces(patternDoc){
		console.log("getForces called! with parameter "+patternDoc);
		//this function is called after a successful getPattern()
		//we extract the force references, fetch from db, and marshall them into the docToSend
		var forceDetails = []; //array to store whole forces docs from db
		var listOfForceDocs = patternDoc.force;

		async.each(listOfForceDocs, function(force, callback){
			db.get(force, function(err, body){
				if(!err){
				forceDetails.push(body);
				console.log(body);
				callback();
				}
			});
		 },
		 function(err){
		 	docToSend['force'] = forceDetails;
		 	res.send(JSON.stringify(docToSend, null, 2));
		 }

		);
	}
```
used same approach above to get and add contributor/author docs to GET pattern/:num route

so

A pattern doc references its contrbutor docs by using the ORCID id xxxx-xxxx-xxxx-xxxx as the handle/doc _id
Forces are referenced by the internal couchdb id, as are reference(bibTEX docs)

OK - so added some dummy files intp couch, get /patterns/:num is now working and returns valid JSON, but
not valid JSON-LD - because our @context hasForce ect define the rage to be a @id and we give an array of forces..
Still need to clean up response JSON fields to hide inplementation details, and sort teh proper JSON_LD that should represent a whole pattern, but progress is being made.
also - used underscore library - very helpful
https://www.npmjs.com/package/underscore
`var _ = require('underscore')`
lets us do extend operations on JSON objects - we use this to combine all the context docs

```javascript
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
		 		res.send(JSON.stringify(docToSend, null, 2)); //<--- we're done, send the response! 
		 	}
		 	else {
		 		goToError(err);
		 	}
		 }
		);

```
note: we might need to refactor earlier functions in app.get('patterns/:num') to use _.extend if we dont use arrays..

OK - so it seems the JSON-LD is not valid because we are specifying 

```
"ORCID": { "@id": "http://purl.org/spar/scoro/hasORCID",
			   "@type": "@id"
			 },

"force": { "id": "http://purl/ontology/lp#hasForce",
				"@type": "@id"
			},

"author": { "@id": "http://purl.org/dc/terms/creator",
				"@type": "@id"
			},

```

etc in the various @context docs. if we remove the @type: @id and just specify say
`"ORCID": http://purl.org/spar/scoro/hasORCID"` then things look better.
JSON-LD then validates in http://json-ld.org/playground/index.html but not anywhere else...!
eg, exporting the N-triples to view at http://rhizomik.net/html/redefer/rdf2svg-form/ or trying
to convert anthing at http://rdf-translator.appspot.com/ causes error - invalid syntax or token.

cant see where the error is...! 

OK - wait. maybe there is no error.

pasting the n-tripes from http://json-ld.org/playground/index.html into http://rdf-translator.appspot.com/
_and specifying input = n-triples and outtput = ntriples_ gives valid syntax that can be visulaised by
http://rhizomik.net/html/redefer/rdf2svg-form/

So there might be a strage character or some EOF/line feed thing going on?

Will sort out later, but the graph without specifying @type: @id in the context still looks correct.
Instead of specifying what should be a URL in the context - add the info inline with @id to specify a url...

Sweetbix....

Sorted it out. What was causing the trouble was where I was specifying @type : @id in the @context, 
JSON-LD was expecting a URL/resource but I was giving an array of resources.
The sematics of hasForce can be specified in the pattern ontology - no need to specify it again here.
Where mappings are 1:1 eg each force has one pictogram - i've specified in the @context that 
for eg.
`"pic" : {"@id": "foaf:depiction", "@type": "@id"}`
this ensures that values that are URLs are treated as resources, not strings.

still need to clean up single pattern JSON(-LD) output to remove couchdb internals but looking good.

NOTE: we have also added within each appropriate function for app.get('patterns/:num') a line to
specify the resource @id in the final JSON-LD.
eg

``` javascript
async.each(listOfForceDocs, function(force, callback){
			db.get(force, function(err, body){
				if(!err){
				body['@id'] = "http://patterns.org/patterns/"+intID+"/force/"+body.int_id;
				forceDetails.push(body);
				//console.log(body);
				callback(); //so we can escape to the final function
				}
			});
		 },
		 ...etc
```

the `body['@id'] = "http://patterns.org/patterns/"+intID+"/force/"+body.int_id;` has the template URL hardcoded.
Nedd to fix or modify this later.


#####20150127
 - addded `doc["@type"] = "http://purl.org/lp/:Resource"` to locations where we specify "@id" in the final JSON-LD
 NB - still hardcoded

 changed pattern ontology so it no longer asserts that people are part of a pattern

 tidied up code, removed old debugging console.logs that were cluttering output

 removed couchdb internal fields/vale from final JSON-LD - note hardcoded at multiple locations
 another targer for refactoring

 implemented /pattern/:num/evidence/:num GET route. <-- note starting to duplicate code now
 consider refactoring many of the functions within each GET route 
 eg, make a general addContex(listOfContexts) etc.

so - at the moment the API only responds to GET requests, and returns static representations of the resources.
There are no links that drive applcation and how we might change the state.
For this we need hyrda to describe the links, and new routes in the API that change the resource state - eg accept a POST and modify or create new resources. 

#####20150128

thinking about how to handle the post request.

first idea is to provide a "form" from "/patterns/new" - a custom JSON with blank fields.
This object can then be manipulated by the client and POSTED to /patterns
One tricky thing to keep in mind - the POST doesent have to look anything like the GET of a design pattern.
IF we keep the POST to accept application/JSON, handling images is tricky
we can base64encode them in the client, add metadata, and then decode and save as attachemnt in couch back in the server.

what about editing a pattern? - this should send a "populated" form, and POST

perhaps try putting current pattern in an "editable" object.
note - the editable object is application/JSON, not JSON-LD...?

how to handle the delete of a composite obect?

note : it is possible to use couchdb's _rev as document versioning *if you don't compact* the db
http://jchris.ic.ht/drl/_design/sofa/_list/post/post-page?startkey=%5B%22Versioning-docs-in-CouchDB%22%5D

just a thought - I could implement a pattern version field (described with Prov) and have it populated by the integer part of "_rev".

any time a patter is edited, I would have to update the main pattern doc "_rev", even if only changes to other docs were required..
Perhaps an easy way to do this is to just db.instert() the whole POSTed update across all internal docs..

arrgh - another headache - how to handle "new" forces, references, contributors on edits.
and if a pattern say 'deletes' a  force - it needs to be removed from the current represenation but still available for older "versions".
And if we 'refine' the defintion of a force = we have changed its meaning, but the URL is the same - this creates inconsistency

patterns need to be updatable, but we need goverance around this process. a versioning system 

what if we allow creation of patterns, but not editing, add discussion forums on the website to coordinate changes, defer the process of addressing these hard issues to future work - focus on _using_ these strucutured representations rather than their creation, evolution, community, etc. 
we envision a github style system - pattern owners have control, but all are free to clone, fork, develop, add new, and make "pull" request.
strike a balance between stability and freedom
because we envision use of patterns as a pragamtic vocabulary and knowledge struntureing tool (not just data in their own right) this has implications for the stability and semantics of pattern resources. Changes to a pattern that affect or modifiy pattern instances require the creation of new URIs or a new pattern to allow gracefull evoutlion and consistency of linked data.


what if...
We currently limit the functionality of the API to create, and get.
Reserve delete and update for future work - this is because of the complexity of propagatign changes to design patterns that affect their meaning.

significant changes to a design pattern 

changes to a design pattern - can be trivial such as typos, or significant new classes (eg force) can be added - this doesn't affect exising instnces, but classes can also be deleted or change definition, this does affect exisitng instances

#####20150129
OK - decided to implement a simple incremental versioning for patterns - any time one is edited(updated) a new rev# is generated.
We never actually delete anyting from the db, we just remove or add references to the main pattern doc, and create any new authors, forces, images, references etc.
so every doc needs to keep 1) a rev (we get this for free if we use the hacky coucdb _rev), and 2) a list of its parents
the main pattern scheama needs to expose its int\_id and rev, and track force, reference both docID _and_ rev to keep things matched.

#####20150130
gah, OK - if we go with versioned pattern docs emitted by the API, we should implement a proper versioning strategy for all the couchdbdocs.
Edits should create a whole new (revised) copy of the relevant docs, and increment the rev number. (not couchdb's "_rev")

#####20152013
So maybe we dont worry about versioing after all - run with a static/permanent representation and revist later.
Idea is back to original plan - have a 'staging' area where patterns can go back and forth in a nacent stage, when ready "publish" them so they get proper URIs and can be served as JSON-LD - we use the 'published' versions to go on an develop an exalplificaiton framework for.

So the API is getting more and more coupled to the client at this state - this is fine - we must remember given time and resource constraints that the focus should be on pattern representation and use as a knowledge strucutre, not API and REST theory..

Implemented /patterns/:id/:img route to return the binary (couchdb attachemnt) of a pattern pic.

implemetned /patterns/:id/diagram/:img to return binary of pattern diagram

implemented /patterns/:id/force/:num/:img to return binary force pictogram

---

added new class of docytypes to coucdh - 'schema' - these represent blank objects that can be sent upon a GET request to say
/patterns/new  the idea is the client can then fill in the blanks and POST back to say /patterns/protopatterns and the JSON is parsed, split into docs (flagged as prototype) and stored for futher editing and retreival (perhaps same as "published" pattern, but with value int\_id = null  - when we publish we set the current incremetn for int\_id, also flip a field published=true ?)

created mock "instatiated" new.json to POST and attempt to split and wrange into appropriate docs.
currently it takes references as an array of strings, with each string being a bibTEX citation. (from google scholar - cite > bibTEX > copy/paste)

we can use `https://www.npmjs.com/package/bibtex-parser-js` on the server side at _publishing_ time to format the strings into the doc fields.

did `mpm install --save bibtex-parser-js` and added `bibtexParse = require('bibtex-parser-js')`
NOTE: we need to call the parser via `bibtexParse.toJSON('string')` and enusre there are no carrage returns in the string. 

//so why didn't I just make one pattern doc for all the parts, and have node.js fetch the doc, internally wrange it to spit out whater /pattern/{path} requires?? 

created route `/new` where a GET request will send back an empty JSON object to be instantiated and POSTed back.
we delete the dbfields _id, _rev and set 'doctype': "newpattern", ready for POSTing back.

NOTE - originally tried to make the route /patterns/new - but this clashes with /patterns/:num - found bug where I didnt check for :num === integer. better to move /new further up the URI anyway... 

#### It is important to check and sanitize all GET and POST parameters.

Using validator.js
https://github.com/chriso/validator.js
`npm install --save validator` and `var validator = require('validator');`

Stop press - nope - the error was actually becuase I had a code fragment where I had started a app.get('patterns/new'){} and left it hanging.

removed offending code.

But its still a good idea to never trust user input... :)

Added a check for GET requests for /patterns/:num /patterns/:num/force/:num and patterns/:num/evidence/:num
to check if params are numbers - if not, go straigt to 404
used `if (isNaN(:num)) goToError();` i.e if the params are anthing other than numeric - don't even bother.

---
Started working on POST for /new
First lesson - we need to strip new line characters from JSON stings or else it's not valid.
This tripped me up becase pasting in bibTEX citations from google schoalr includes such formatting characters.
Be sure to wrangle/sanitise such strings in angular before POSTing to /new etc

got to first step - confirming post request body is JSON, formating it, shoving it into a variable for further wrangling.
NB - remember POST requests must have headers set to `"Content-type": "application/json"`

#####20150204

OK - so leant the hard way the differnce between JSON and jaascript object.
JSON is a data transfer/serialisation format - all keys must be quoted strings - this allows reserved js keywords to be used as keys eg "new": "car" is valid JSON, but new: "car" causes trouble...

Part of the difficulty I was having with the POST request was confusing the two.
req.body is a js _object_ - using JSON.parse doent work because it's already an object.
So - we POST a JSON (string) - express already parses it into an object (req.body) 
I was attepting to parse it again (assuming req.body was the same string I POSTed) and then convert it to a string!
So dumb. 

implemented basic/generic express error handling 

declaring
```javascript
app.use(function (error, req, res, next){
	if ( error.message === 'invalid json') {
	res.sendStatus(400);
	}
});
```
means that any express/middleware "error" will be caught - here we check if the error was from body-parser sending the value "invalid json"
if so - send a 400. this catches any clients that attempt to POST non JSON.

next we should implemnt a check of the POSTed JSON/object to see it has the right fields, then proceed to split it and store it in the db.

we can use tv4 https://github.com/geraintluff/tv4 and supply a schaema to validate the the POSTed json is what it claims to be.
JSON schema info - http://json-schema.org/ http://spacetelescope.github.io/understanding-json-schema/ http://json-schema.org/latest/json-schema-core.html

added a validation scheama to the syncSchemaDocs.js - remember to remove the _id and _rev doctype fields from the db object before using to validate POSTed json.

hmmm - implemented tv4 validation against schema, but any old JSON seems to validate.. Need to fix, this, but for now will continue as if it was valid and deal with splitting and storing.

OK - decided to save - "new" patterns as a doctype "protopattern" - this is stored as a whole document, and is meant to be passed back and forth as monolithin JSON between the angualr based web(page) client. we dont attempt here to split all the docs or wrange for final publication. these docs and representations are meant soley for pushing simply back and forth between the creating editing client.

Once a "new" pattern has been fetched and posted, it should then becomes available via the /prototype:/num route...
so to implement this next.... :)

Note - we have settled here on a incrementing integer scheme to identify pattern and protopattern docs. This is of course a fundamentally broken model, but its faster to persist with it now for the prototype, than to implemnent a better one.
The main reason for this nameing scheme was to facilitate human understanding of the URIs, we dont anticipate many patterns, concurrent users, etc. Of course we know many decisions in what we are buldign here probably wont work well inthe real world.
This is a consequence of my "flying by the seat of my pants" - learning web programming concurrently as we build our representation framework...

#####20150205

OK - so realistion. URIs, URLs, . My inital URI scheme for pattern concepts was tied up with the URL scheme for the API.
This was causing headaches and confusion.
eg - /patterns/:num/force/:num is a great URL scheme for an API.
But its a bad URI scheme for linked data. We should separate the individual pattern concepts out from the hierarchial pattern URL(URI) - instead of encoding implciit semantics in the URI/L use opaque strings for the URIs (which also happen to be http URLs), and have the linkages explicitly encoded in the representations i.e JSON-LD.
Use rdf:label too to help with extracting human readable info.

ALSO - i need to revist cool URIs for the semantic web - I have been overloading my URIs - to refer to both concepts and documents about the concept. re-read, get it straigt and design a proper URI stratege for the API/docs and the concepts. Map it out, and fix the implementation...

So - we need to distinguish between informational and non-informational resources - our design patterns are firstmost informational resources - i.e. documents that dsecribe things in the world, but simultaneously, we wish to extract from these docuemtns, the useful concepts and real-world things the pattern docuemnts talk about, and denote these with unique identfiers, so we can talk about and make assertions with these concepts (not the documetns that describe them) on the web. Thus, publishing a design pattern via our API results in the creation of a number of new URIs - both informational and non-informational. 
As per the cool URIs for the Semantic Web - we adopt a 303 redirect strategy when requests are made to non-informational resources, and forward the client to a JSON-LD representation (doc) that describes the resource, and maintain explict links between the URIs.

list 

	Non-informational (cenceptual)		Informational
	/pattern/:id 						/jsonld/pattern/:id
	/pattern/:id/force/id 				/jsonld/pattern/:id/force/:id

and give example - e.g. bob tries to do x, gets y etc...

NOTE - under this scheme, the '@id's in my JSON-LDs should be the non-informational resouce URIs,

Also - the missing reference I couldn't find for ages  - http://ceur-ws.org/Vol-929/paper10.pdf
what we are trying to do here has many parallels to building ontologies using re-engineering patterns - or rather we are combining modes of transformation here - population, t-box, a-box. The APIservice and /publish function effectively achieves 
1) initial creation of a protopattern (an 'non-ontological' at this stage from a semweb point of view)
2) the population of the pattern ontology - we assert new instances of Patters and force classes
3) a/t box transformation - named forces become subclasses of Pattern:Force - themselves ontologial resources.
4) the subsequent publishing of all these.

#####20150303

OK - slooowly getting back to making this hyperPatterns API thing.

1st thing - revisiting the lab pattern ontology.
In trying to draw it, I realised some n00b mistakes.
Between various ideas about what should be a object or literal etc.. I had failed to distingusish in my mind the difference between class > individual > literal and mixed up ObjectProperty and DataTypeProperty
http://stackoverflow.com/questions/17724983/how-can-i-recognize-object-properties-vs-datatype-properties
sooo.... redrawing in cmap the upper pattern ontology (classes), individuals (patterns), and literal data....
thn go back and 

#####20150310

Ayyyyyy! So - tidied up pattern ontology - now at a stable v0.3.
Four classes
-DesignPattern
-Reference
-Force
-Contributor

One ObjectProperty
-hasForce

Four DatatypeProperties
-hasContext
-hasSolution
-hasRationale
-hasProblem

. wrote it as a hash URI scheme in .ttl
. used any23 (web) to transform to xml/rdf
. hosted rdf/xml on a gh-pages branch of github - http://cameronmclean.github.io/pattern-ontology/pattern-ontology.rdf
. created a PURL www.purl.org/NET/labpatterns to do a 303 "see also" redirect to point to the rdf/xml above.
. a curl GET -v shows that the content type is correctly served as application/rdf+xml , and gh accepts \*/* so all good.
. labpattern ontology is now live on the web - woohoo!

now to write up in chap4, get node.js URIs, routes, @context up to date...

Bueno!

######20150317

updated routes in hp.js to match chapter 4 URI scheme.
Still twiddling about how to deal with images and pictogram URIs+namespaces, and in general the use of /id or /doc in linked data when referring to concepts.

Added in a quick link back for representations of single forces or reference - used dcterms isPartOf to point to the parent pattern.
These feilds are added at runtime, hardcoded in hte node.js app.get routes.
Didnt implement the same link backs in a whole pattern representation - thye are aleady connected and I didn't want loops 

looking alpaca to render forms for new patterns on the client - this could replce the newPatternSchema to an alpacaSchema.
A GET to /new would give the _alpaca_ schema for web forms, and the client would wrangle it back into an appropriate JSON for valiation on the server. 

ok - kinda got it working - just need to sort out CORS for testing.
Wont be a problem on real server becase requests will be made to the same origin...

#####20150319

OK - so alpaca forms are both great and not so great.
I can probably get them working - but the documentation is shit and it works in hacky/weird way.
for example - just spent an hour trying to render a upload file button.
instead of having a direct "schema": like so

```
 "pic": {
 	"type": "file"
}
```

we need to specify in an "options" and then in "schema"

```
{
	"options": {
		"fields": {
			"pic": {
				"type": "file"
		}
	 }
   },
   "schema": {
   		...
   		"pic": {
   			"type": "string",
   			"format": "uri"
   	    }
   }
}
```

makes absolutely no sense, but it seems to work.
lets hope alpaca hangs around long enough to get through...
i should defo figure out how to do the local build from source so I can serve/rely on my own copy of bootstrap, css, js, everything...


OK - sooo populating an alpaca form is pretty simple - just give `$("#form").alpaca();` a JSON with
```
{
	"dataSource": {..."field": value(s)},
	"options": {...},
	"schema": {}
} 
```
etc...

Ohhh - I get why the file thing was tricky now - the "schema": part must conform to official JSON schema.
In "options" we specify the HTML5 etc flavour of what we need that field to be...

also http://json-schema.org/implementations.html has useful info.
I could try other valiators and front end forms/widgets if alpaca ends up being too difficult.
https://github.com/jdorn/json-editor in particular might be more lightweight?

OK - so also built local version of the alpaca stuff /alpaca2/build has the bootstrap etc .css, .js files.
but note, we also still need to load the following dependencies for alpaca in our HTML.
although of course, we will now probably use jQuery 1.11.1 and bootstrap 3.3.2 for all our client stuff now - just to make it easy...

```  
<!-- jquery -->
    <script type="text/javascript" src="http://code.jquery.com/jquery-1.11.1.min.js"></script>
     
    <!-- bootstrap -->
    <link type="text/css" rel="stylesheet" href="http://maxcdn.bootstrapcdn.com/bootstrap/3.3.2/css/bootstrap.min.css" />
    <script type="text/javascript" src="http://maxcdn.bootstrapcdn.com/bootstrap/3.3.2/js/bootstrap.min.js"></script>
     
    <!-- handlebars -->
    <script type="text/javascript" src="http://cdnjs.cloudflare.com/ajax/libs/handlebars.js/1.3.0/handlebars.js"></script>
 ```

So, also discovered httpbin.org - super useful for testing!
Annnnd, submitting JSON with alpaca is really quite simple.
to the "options": {} JSON add a 
```
"form":{
		"attributes": {
			"action": "http://httpbin.org/post",
			"method": "post"
		},
		"buttons": {
			"submit": {}
		}
```
and voila - httbin.org/post lets us see the resulting POSTed JSON - can work from there...
note - need to set method=POST and enctype=multiplart/form-data on the form?
also, enc type is not set - set to UTF-8...

Still, progress!

#####20150323

OK - so handling file input in forms in an ajaxy/JOSNy way is a pain.
In the interests of time, proabably stick to multipart/form-data format for POSTing to /new
seeing as we GET a alpaca schema anyway, it doesnt really matter that it's not a JSON for posting - we are coupled to the alpaca front end.
Will need to implement some logic on node.js to wrange the post into stucutres for storing into prototypes.
might need a hidden field to keep track of patter/prototype ID when sending back and forth for editing.
>https://github.com/mscdex/busboy   looks helpful

so, need to ensure
1) /new GET gives a alpaca schema
2) /new POST receives multipart/form-data, which is then wranged into a prototype.
3) /prototype/{id} - GETs a JSON
4) /prototype/{id} POST receives multipart/form-data - we can check serverside that formID = urlID

need to sort out - JSONparse vs busboy for the differnet routes - and how will I "publish?" - i.e set flag isPublished = true

#####20150330

So, still fiddling with alpaca forms - will go with multipart/form-data and alpaca scheama for sending back and forth between /new

In order to start thinking about the front end - need to get express to serve normal or static html/js/css etc
WE do this by creating `/public` dir in the `/site` dir, and telling express to serve anthing in or under the public dir by specifying `app.use(express.static('./public'));` in hp.js

I put an index.html in /public, so now, even without specifying a route in express, a GET request to 127.0.0.1:3000/ by defaut serves up this index.html.
I'll build the jQuery web page app in index.html to handle the ajax calls and dynamic DOM manipualtion for interacting with patterns. 

made a html dir, put in alpaca2.html which is the blank form page for creating a new pattern.
used jQuery to link up a button click from index.html to load alpca.html into a `<div id='centerstage'>` within index.html.

next is to make the submit button do an ajax post to /new
AND note under the current plan, we dont need to do a GET to /new

using /new2 to write test code to process POST of new pattern form.

Installed `npm install --save busboy` and required() it, commented out body-parser.
currently piping the POST req object into a new busboy object, ready for wranging and saving as JSON/alpaca data.

OK - so got busboy to save all files that are posted into `./tmp` prepended with the `formfield+" __"` I can regex these and then save them as attachments to teh appropriate couchdb as a final step.

I also need to clean the tmp dir after a successful dbsave/all the POST is wrapped up.
can try using rimraf https://www.npmjs.com/package/rimraf to simply the ./tmp `rm -rf` I want to do this so the dir is clean ready for the next POST. Of ocurse there will be concurrency issues here if two users try posting a new form at the same time... but not dealing with that for proof-of-concept...
> I could gat a sha1 hash of time, and save all POSTed files to tmp/sha1hash each time though :)

yes - actaully even simpler
did `var crypto = require('crypto')` and get a unique rando number each time POST is called by 
`var session = crypto.randomBytes(20).toString('hex');`
SO to the rescue again http://stackoverflow.com/questions/9407892/how-to-generate-random-sha1-hash-to-use-as-id-in-node-js

for each POST we generate a tmp dir with `fs.mkdir(session, ...)` store all the stuff there, then delete the session dir with `rimraf()` - see https://github.com/isaacs/rimraf

> so then,...  concurrent POSTs sorted for now! :)

#####20150331

changed tidyUp() function to accept a callback and add an empty  `.keep` file to `./tmp` so that git tracks the "empty" dir. Needed only if someday someone tries to clone and run this thing - the code expects a `./tmp` in `/site` for the handling of files submitted by forms. To write the empty file - `fs.openSync('filepath', 'w');` the 'w' flag truncates or overwrites...

current status - under form.on('file', ...) we also push the file data into an array in mem for adding to couchdb directly instead of via the filesystem. This seems to work, but having trouble getting nano db.multipart.insert() to work properly - getting http 412 from couchdb - maybe to do with request headers or something already 'exists' in couch db. SOme pre-condition is not matching - need to try inspeacting all the http requests and headers....
If I can get this to work thouhg, things will be nice a simple.
also - need to change filenames in attachemts[] to pre-pend form fields for easy matching/ID later...

hmm - so jsut adding the doc seems fine, will try adding attachments after the doc is created in couch

hmmmm - so adding attchments after adding the doc is fine > except I have to get a current _rev each time.
This is tricky with async calls - using aysnc.each() to add an attachment should work, but it seems every time it still only grabs a doc with _rev : 1-xxxx .... hmmm seems because getting the rev from body2 in the dbget() callback is undefined...

GAH! - it was because the body returned from the various db callbacks is different... a db.get() returns the whole doc, and db.insert() returns just the docID and rev...

fixed now, and async.eachSeries() is a good thing - should use it more often instead of callback hell.
http://callbackhell.com/

SOOO- now what happens is when we POST to /new2 , the form data gets saved as a single couchdb doc, with key:values matching the form fields (should simplify populating a form to edit prototypes) Files are saved as attachments to the doc in couchdb, with the formfield prepended and separted by double underscore'__'. 

NOTE - i am still saving the files to ./tmp and them deleting them too. I can probably remove this code.

Also, i updated the nano module to 6.1.2...


Next - created GET /prototypes route that returns a list of all the prototype pattern names and int_ids
list.html will need some jQuery wrangling to display them all nicely, but it can at least get them all for now.

Next we want to also show the pattern pic, make them clickable, implemnt a /prototype/:id route that loads a populated alpaca schema / data .. and then hook up a post (and publish! ) button that saves the revised schema, (or publishes it!)  


#####20150401

started on /prototype/:intID

now looks up all protoPattern docs, loops thorough until int_id === :intID and returns the whole doc.
next to implement logic to wrangle it into alpaca form data....

OK - so  - getting data back into forms where there are multiple instances of say, author - probably need to squish say ref\_0_reference back into an array of reference: [] or author: [{},{},{}...] ??
kinda implicit in these examples - eg address > street
http://www.alpacajs.org/demos/bootstrap/customer-profile/edit-custom-view-form.html
http://www.alpacajs.org/demos/bootstrap/customer-profile/data.json

yes - as above.

but wrangling all the fields back into a suitable arry is tricky.
decidied to loop through integers up to 20, and if author, ref, force match, grab the appropriate fields, put them in an object, and push them into an array in the wranged data to be sent back to alpaca forms.
we can use the reverse logic when spliting docs to store for final pattern publishing.

a little trick - instead of looping within loops for every check, - to see if an item is in array use
`array.indexOf(thing) > -1` 
seee http://stackoverflow.com/questions/1181575/javascript-determine-whether-an-array-contains-a-value


GAH - ok - so pre-populating file input fields on forms is not allowed - for security reasons duh/
This means that I need to implement logic on the server to see if new files are added, overwite exisiting attachement, and generally keep the _attachments metadata intact for PUT/POSTing i.e updating the protopattern doc back in couchdb...

also - need to figure out a way to pass the proto-pattern id to the get request to bring in the edit.html.
presumably we can do this using URL query params, and write some JS on the edit.html to grab it, and fetch the correct prototype data.

#####20150413
Tinkered with the html+js to make links from protpattern list.html load the edit.html with query string ?id=x 
edit.html now has some minimal js to parse the query sring and load the appropriate datasource into the alpaca form.
querystring parsing was a shameless copy and paste from 
http://www.jquerybyexample.net/2012/05/how-to-get-querystring-value-using.html

NEXT - make the list.html load the populated alpaca form in the centerstage div, not as a new page...
Need to implement some kind of 'grab the id and pass the value to .click().load()' function in jQuery/js

hmmm. seems loading a .html withing a <div> means we cant access the url query string
http://stackoverflow.com/questions/3180841/jquery-get-querystring-of-loaded-page-in-a-div

I can only access teh query string from the main page , no the loaded html within the div.
`var sPageURL = window.location.search.substring(1);`

need to find some other way of passing the clicked on ID to the /edit.html load.

One quick fix is just have it load as a new page - and duplicate the scripts/headers/nav of index.html...
i.e make them standard links again, not jquery selectors that load the edit.html within another div.
This is dirty and hacky but super quick just to get going...

OK - bit of a mess - have now got list.html jQuery to pick up the id of the clicked on protopattern, then load a whole new page, passing the id to edit.html as a ?id=x query param.
Need to fix edit.html to resemble index.html and make the nav buttons work etc.
Then how to parse and submit the editied proto-pattern....
then then how to "publish"
sloooly getting there...

need to tidy up code - remove console.logs and alerts too.

#####20150414

OK - so added some hacky bits to allow nav buttons to work between home/new/edit screens, across AJAX <div> html insertion OR new page loads...

Also added two more sattic html pages that are redirected to after a post. These display a "success" message before redirecting back to the home index.html
- redirect was implemented in js directly in the page

```
<script language="javascript">
setTimeout(function(){
	window.location.href = "/";
}, 4000);

</script>
```


Added "int_id" to /prototype/:id JSON (alpaca form data), and used as hidden field so when we POST to 
/prototype we can get the couch db \_rev via int_id and update accordingly.

So POST route to /prototype can implement nearly the same logic as /new, except we need to worry about matching up and updating any attachmetns...

OK - so half way there...
reused much code from POST /new - currently attachments are overwriten upon new POST, so just need to add logic to compare old with new copy metadata over and shoudl be OK.
ALSO - noticed that context field is never saved - check hp.jp for typos in this key/value wrangling... << FIXED

So the next step is to add _attachments as hidden fields (in a conveinient format), so we can wrangle it for compare and update at POST/couchdb insert.attachment()

#####201504015

Hmmm updating docs with attachments and keeping the attchment is turning out to be a real PITA.
Perhaps refactor to store images as seperate docs and use Alpaca image fields....

OR - forget about it for now - users must re-upload images upon editing...??

Stop press - so it seems that by getting the _attachments just before saving to db, rather than trying to pass them across the web in a hidden form field works!
Only now need to implement
	- logic at db.insert/attachment.insert to allow only one pic__ force\__0__ .png etc
	- remove unneeded hidden form fields
	- perhaps modify edit form schema to display current images.
Nice!

> I think the lesson here is that the data was being altered/encoded as it passed from server across the web via forms and back, and ended up transformed in a way couchdb didnt like? 

OK spent _ages_ in callback hell implementing logic for cheking, deleting (if necessary), and adding new attachments to the protopattern couch db doc.
working now, but code is quite like a 'christmas tree'... nested 4 callbacks deep :(

but at least does what we need for now.

next - to modify edit forms/schema and GET /prototype/:id to display current pictigrams?

Then all that remains is the PUBLISH logic, and to prettfy, plus a few more "list/browse" views...
<sigh>
But nearly there...

#####20150416

Added html/jQuery to have the list of protopatterns populate a table, with buttons for view, edit, publish.
Each button gets an id= prefixed with v, e, p respectivly followed by the protopattern :id
making dynmaically loaded html elements clickable with jQuery requires _delegation_
```
	$('#prototable tbody').on('click', 'tr td button.edit', function(){
 	 	var number = this.id.substring(1);
 		//load a new page with the populated form
 		window.location.href='../html/edit.html?id='+number;
 	});
``` 
the above selects the closest static anchor, then .on('click' ..) we give the selector of the dynamic html parts, then give the callback function to execute upon detection of a click event.

Next - started working on a proto-pattern view. This will be a new page, to which a protopattern content can be populated into dynamic html elements.

Note : new bug today -> editing/updating a pattern expects "_attachments" in exisiting protopattern doc
if we dont add any files when creating a new pattern, this doesn't exist yet...
I cant force people to attach files, so need to change POST /prototype logic...
_FIXED!_

#####20150417

Workin' on the pretty view for protopatterns.
Spent _ages_ wondering why `<div>`s in the forces loop were stacking up and not displaying as block elements.
Turns out its becuse the `<img>` was bigger than the div, messing things up.
Fixed by adding 
`overflow:auto;` to the indiv forces class in css
see http://learnlayout.com/clearfix.html
uh. anyway, fixed now.

Wrote a bunch of jQuery to get, parse, match prefix and load images for protopattern view.

Protopattern view now complete!

Started on view for published design patterns.

created /patternlist GET route to return list of doc ids and int_ids for all published patterns
(doctype: "pattern") in couchdb.

patternlist.html grabs the name and puts it in table just as for list.html does for protopatterns
 next to wrangle the view click to go to say patternview.html?id=?
 then wrangle all the various AJAXy published pattern docs into a single page view.

 then then to write the publish logic.

 Then v1.0 is complete!!

#####20150419
got pattern view all sorted.
note trickyness with getting images - currently the image is stored as an attachemnt with either the pattern or force document and also specified by the URL "http://localhost:3000/doc/pattern/:id/:img .. /:id/force/:id/:img" etc. This might be a headache to wrangle upon publish logic - getting the attachments, copy to new doc, add field to describe the attachemts again... but whateves. 

So, just to do the publish logic now (and maybe add helpers for protopattern existing files...)

Soooo, the whole restful thing is rapidly going south -
to implement a quick and dirty "publishing" logic, i set up a GET route "/publish/:intID"  - this will grab the intID, check for an exisiting protopattern, if OK - do the publish logic, else, return 404.
The list.html jQuery grabs the intID from the publish button click and makes an AJAX get to /publish/:intID.
If theres a 200 OK!, we go on to publish.html for 3 secs to keep the user busy while we wrangle.
IF the AJAX request fails - we alert "error and just return to the list."
NEXT is to do the publish logic from the node side....

got publish working on first round of putMainDoc
NOTE - we are getting server side errors TypeError: Cannot read property 'length' of undefined when we try to view incomplete patterns
- this is likely because we havent finsihed updating all the doc bits yet..

ended day halfway throgh putForces logic.
Doesnt seem to be picking up the "pic" string to hardcode to the new force doc "pic": URL.
Sort this next > as _attachement deets/filenames need to be db.get.attachment , saved to mem and copied to corresponding nre force docs as attachments .
 NB - write a fucntion that does this, and call it from the first putForces() async.eachSerial callback... (to avoid deep nesting/readability)
 
#####20140420

keep falling into same trap = iterators outside async function calls dont work as expected... sigh

hmm not 100% sure, but trying to pipe an attachments.get() to an attachments.insert() doesnt seem to work - same db/port problems?
will try saveing as tmp file and then sending back - inefficient but will work, and we're not expecting high traffic here..