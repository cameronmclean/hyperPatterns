
Resources													HTTP 			Response

http://labpatterns.org/id/pattern/:id 						GET				303 See Other
http://labpatterns.org/id/pattern/:id/force/:id 			GET				303 See Other
http://labpatterns.org/id/pattern/:id/ref/:id 				GET				303 See Other
http://labpatterns.org/id/contributor/:id 					GET				303 See Other

http://labpatterns.org/doc/contributor/:orcid				GET				200 OK
http://labpatterns.org/doc/pattern/:id/force/:id 			GET				200 OK
http://labpatterns.org/doc/pattern/:id/ref/:id 				GET 			200 OK
http://labpatterns.org/doc/pattern/:id 						GET 			200 OK
http://labpatterns.org/doc/pattern/:id/:img 				GET 			200 OK
http://labpatterns.org/doc/pattern/:id/diagram/:img  		GET 			200 OK
http://labpatterns.org/doc/pattern/:id/force/:id/:img 		GET 			200 OK


http://labpatterns.org/prototypes 							GET 			200 OK
http://labpatterns.org/prototype/:id 						GET  			200 OK
http://labpatterns.org/prototype/:id/:img 					GET 			200 OK
http://labpatterns.org/patternlist 							GET   			200 OK

http://labpatterns.org/publish/:id 							GET 			302 Found (redirect)

http://labpatterns.org/new 									POST 			302 Found (redirect)
http://labpatterns.org/prototype 							POST 			302 Found (redirect)



NOTE: We originally aimed for a completly RESTful style, but teh overhead in design and implementation was too high.
Our aim here is a quick and simple pattern publishing service, one that we can build other proof-of-concept tools on for the purposes of the thesis. Due to time and resource constraints, this implementation is 'good enough', but does not necessarily reflect best practice in a commercial deployment setting.


Old notes below
------------


####http://www.thoughtworks.com/insights/blog/rest-api-design-resource-modeling

//this ends up being a fairly fine grained set of CRUD operations on pattern resources.
This makes for a more 'chattier' API (clients must make multiple resquests to achieve a business task" 
- but one that is more transparent, and easier to maintain

hmm- too granular? - we are exposing lots of the business logic in the resources and sequence of requests.
This means the client code has to implement the business logic - creaign tight coupling between the API and the client.
Changes to the business logic will change the API and break the client.

A coarse grained API puts all the business logic on the server side - reducing data inconsistency issues (failed sequences or updates), prevents control-flow business logic leaking into the client (eg - that we need to create a patten before we add forces etc..)

> approach - consider business processes themselves as resources

It is important to distinguish between domain entities (which drive the implementation) and resources in REST API which drive the API design and contract.
API resource selection should not depend on the underlying domain implementation details.

The client should be a source of user intent - not manipulating internal representations. 

Escaping CRUD means that only the service that hosts the resource is able to directly chage its state.

API design should be independent of underlying design concerns on API implementation and data persistance.

Create resources that are equivalent to the business process or command - eg "create new pattern"
//I can still have fine grained resources - eg for GETing to check progress, dereferencing individual resoureces or remixing (and for posting to behind the scenes), but make the create process one resource, with the payload split and business logic handled by the server. The reified resources become transactional boundaries for the service.

URI space is infinite - avoid resource proliferation, but as long as there is a need for resources that have a clear user/consumer intent - go and expand.

REST without PUT - make all updates nounified POSTs to the /update resource.
This separates command and query interfaces - we POST commands at one resource (the C), GET entities from another endpoint the Q) in CQRS
PUT puts too much internal domain knowledge into the client


Our 'change' resources mutate the state of other resources.
eg /newPattern or /editPattern- changes the state of /patterns/{patternName} etc
but we can still GET /pattern/{patternName}
Via this scheme, consumers must allow for eventual consistency - as POSTs to /newPattern or /editPattern could cause multiple (asyncronous) changes to their contained or relevent other resources.

reifiy consumer intent into resources - eg GitHub's 'fork' and 'merge' are sub-collection resources that can list exisitng or create new..


//
yah yah - so....
The *API* only has to provide GET functionality to the resource we need to give/mint URIs 
The editing or creating is handled buy seperate "command" resources, with a monolithic JSON/form-data, and the node.js code implements the business logic.
THis gives nice separation. If want to chage the logic the client doesnt break - it still GETS the atomic resources and POSTs to the same resource - only the payloads change...
COOl ay!


---------


