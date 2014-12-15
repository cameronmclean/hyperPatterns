//This is the node, express/rest-connect, couch hypermedia API for lab pattens

//var express = require('express');


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

//couch db settings
var nano = require('nano')('http://127.0.0.1:5984');
var db = nano.use('patterns');

// First routing - return all patterns from couchDB as JSON-LD/hydra
rest.get('/patterns', function(request, content){
	//return {"hello": "world"};	
	return db.get('hello', function(err, body){
		if (!err){
			console.log(body);
		};
	});
});


//create a new pattern
rest.post('/patterns', function(request, content){
	
	var newPattern = content;
	console.log(content);

	db.insert(newPattern);
});