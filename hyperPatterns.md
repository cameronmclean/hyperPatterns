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
3) modelling patterns as RDF/JSON-LD - we start with the JSON-LD that we eventually want, and then implement the server and DB to marshall various documents and resources to produce this content. 

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
Created lib folder. First script is syncDesignDocs.js which specfies all the design docs we want to use/store in couchDB. Running `node syncDesignDocs.js` from the hyperpatterns/site/lib dir will write teh docs to couchdb /patterns/_design etc...

######20141216
When doing couch db doc updates - need to read in whole doc, make changes and PUT back. The '_rev' must be present and same as current rev in order to prevent a update clash.

A PUT to a doc with mathching _revs is accepted, and the resulant doc gets a new _rev.

I wrote some hacky/inelegant code to get the current _design/patterns doc, extract the _rev, and append it to the defined docs in syncDesignDocs.js - currently it assumes the design doc already exists.

#####20141217
Some design considerations - we could store three types of docs in couchdb - pattern doc, force doc, @context doc. (perhaps also a fourth author doc? and a fifth bibJSON doc?). This allows us to separate the "content" which can be wrapped in an RDF "contex" at query time and allows content and contex to be decoupled, creating ease of maintenence and developmemt. when an api call is received by node, the server is responsible for calling couchdb _views _displays _lists etc, which marshall and join the approproate docs, - where couchdb joins or views are difficult, we can combine multiple db views in node and perform additional processing to formulate the appropriate response. This might be (relatively) straight-forward for GETing data, but perhaps it makes sense to decide docuemnt boundaries for easy POST/PUTing of data - the node server and middleware will be responsible for parseing these requests into the approprite JSON strucutres for insertion into couchdb. 

Design decision - we should put all the event and update handling, mulitdocument validation etc in the node app.This means if we later want a differnet doc store, we only have to refactor/change code in (mostly)one place. 

Also - the decision to separate the @contex - means we can create clean, plain JSON at the flick of a switch.

#####20141218
Started on creating seperate @contex .json docs for various components of patterns - authors, pattern body, forces and bibTEX/JSON references. These contexts can be appended to representations by node.js middle ware as required and added as an array "@context": ["http://patterns.org/context/bibTEX.json", "http://patterns.org/context/forces.json"] etc...

started on bibTEX.json as a contex to wrap bibTEX files that are parsed as/into JSON. bibTEX.json is a mapping for the typical bibTEX keys. 
Note JSON-LD is case sentive, while bibTEX is not - therefore remember to implementa a .tolowercase() when parsing in bibTEX to JSON. *only for the resulting (bib)JSON KEYS*
plan on using this bibTEX to JSON library for node.js - https://www.npmjs.com/package/bibtex-parser-js

The list of bibTEX fields to match to vocabs was taken from wikipedia [here](http://en.wikipedia.org/wiki/BibTeX).

NOTE: the need to aviod name collisions in @contexts - eg "name:" and "title" - may be for journal, person, pattern, force etc... perhaps pre-pend potential collisions with something like patternName: patternAuthor: forceName: etc... 


Note: as far as possible we have tried to use SPAR ontologies (http://sempublishing.sourceforge.net/) but there are still gaps - we resort to using the older http://zeitkunst.org/bibtex/0.1/ bibREX in OWL vocab as it maintans the closes semantics. 