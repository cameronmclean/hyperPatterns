//This is the node, express/rest-connect, couch hypermedia API for lab pattens

//var express = require('express'); //<--------Express NOT USED?!


//API details
var http = require('http');
var connect = require('connect');
var rest = require('connect-rest');

var apiOptions = {
	contex: '/api', 
	domain: require('domain').create(),
};

//create node.js http server and listen on port
var app = connect();
app.use( rest.rester( apiOptions ) );
http.createServer(app).listen(3000);
console.log("connect server started and listening on port 3000");


//temp POST route for receiving a pattern contributor
// this will take a JSON with all the right deets, split it
// and store it in couchdb, with a doc ID created from the ORCID id.
rest.post('/test', function(request, content, callback){
	console.log("getting it!");
	//console.log(content);
	//console.log(request);
	callback(null, content+"yo!");
});

rest.get('/hello', function(request, response, callback){
	console.log("hello!");
	console.log(request);
	callback(null,"hello!");
});