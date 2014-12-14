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