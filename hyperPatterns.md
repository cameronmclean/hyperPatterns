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

I wrote some hacky/inelegant code to get the current _design/patterns doc, extract the _rev, and append it to the defined docs in syncDesignDocs.js - currently it assumes the desing doc already exists.
