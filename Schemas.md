Schemas for *couchdb*

here is the interal representation of all pattern documents that node and couchdb wrangle into
the final JSON-LD and representations that are sent.

*@Context Doc*
{
	"\_id": "name",
	"\_rev": couchdb_hash,
	"doctype": 'context,'
	"@context": {
		"key": "value"
		...
	}
}

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
	"\_id": orchid_string ,
	"\_rev": couch_db hash,
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

*Evidence doc*

{
	"\_id":  ,
	"\_rev": ,
	"doctype": "evidence",
	"int_id": integer,
	"parentPattern": "_id",
	"address": string,
	"author": string,
	"booktitle": string,
	"chapter": string,
	"doi": string,
	"edition": string,
	"editor": string,
	"entrytype": string,
	"journal": string,
	"month": string,
	"number": string,
	"pages": string,
	"publisher": string,
	"series": string,
	"title": string,
	"url": string,
	"volume": string,
	"year": string
}