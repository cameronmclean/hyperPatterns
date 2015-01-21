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
