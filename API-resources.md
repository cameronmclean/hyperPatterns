
Resources											HTTP

/patterns											GET - returns list of all patterns {Name, Pictogram, Problem, Authors, GET URL}
/patterns/new										GET - returns form/json template? (API specific resource for HTML client) - POST to /patterns
/patterns											POST - JSON encoded strucutre 
/patterns/{patternName}								GET - returns composite resource representatio of entire pattern and child resources
/patterns/authors 									GET - returns {Author name, ORCID, list of pattern name, URI}
*/patterns/authors/new								GET - template for POST*
/patterns/{patternName}/authors						GET - returns list of all pattern authors
/patterns/{patternName}/authors						POST - accepts JSON encoded new author (author must not already exist)
/patterns/{patternName}/authors/{authorID}			PUT - accepts JSON encoded author edit (author must already exist)
/patterns/{patternName}/authors/{authorID}			DELETE - and its gone
/patterns/{patternName}/forces						GET - returns list of all pattern forces
/patterns/{patternName}/forces						POST - accepts JSON encoded new force (force must not already exist)
*/patterns/:patternName/forces/new					GET - template for POS*
/patterns/{patternName}/forces/{forceName}   		GET - JSON-LD force
/patterns/{patternName}/forces/{forceName}   		PUT - accepts JSON encoded edited force (force must exist)
/patterns/{patternName}/forces/{forceName}   		DELETE - and its gone  
/patterns/{patternName}/forces/{forceName}/{pic}   	DELETE - and its gone  
/patterns/{patternName}/evidence					GET - list of JSON-LD encoded bibTEX references
/patterns/{patternName}/evidence					POST - bibTEXT reference (media type?)
/patterns/{patternName}/evidence/{refID}			GET - JSON-LD encoded bibtex ref
/patterns/{patternName}/evidence/{refID}			PUT - edited bibTEX reference (media type?)
/patterns/{patternName}/evidence/{refID}			DELETE - and it's gone


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
The editing or creating is handled buy seperate "command" resources, with a monolithic JSON, and the node.js code implements the business logic.
THis gives nice separation. If want to chage the logic the client doesnt break - it still GETS the atomic resources and POSTs to the same resource - only the payloads change...
COOl ay!


---------
####OK, the master list.

Routes implemented so far

/patterns/contributor/:orcid 			GET - returns JSON-LD of anthorName, and ORCID as HTTP URL

/patterns/contributor					POST - accepts JSON 

/patterns/:num							GET - returns JSON-LD of entire pattern

/patterns/:num/force/:num				GET - returns JSON-LD of single force

