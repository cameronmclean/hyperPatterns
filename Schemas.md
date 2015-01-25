Schemas for *couchdb*

note - these are not @context docs, but the interal representation of pattern documents that node and couchdb wrangle into
the final JSON-LD that is sent.

*Pattern Doc*

{
	"\_id": couchdb_id,
	"\_rev":	couchdb_hash,
	"doctype": "pattern",
	"int_id": integer,
	"name": string,
	"author": ['_id'],
	"context": string,
	"problem": string,
	"force": ['id'],
	"solution": string,
	"rationale": string,
	"diagram": url,
	"evidence": ['_id'],
}

*Contributor Doc*
{
	"\_id":  ,
	"\_rev": ,
	"doctype": "contributor",
	"ORCID": url,
	"authorName": string
}

*Force Doc*

{
	"\_id":  ,
	"\_rev": ,
	"doctype": "force",
	"int_id": integer,
	"forceName": string,
	"description": string,
	"pic": url,
	"parentPattern": "_id",

}

