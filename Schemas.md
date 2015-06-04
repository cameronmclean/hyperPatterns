Schemas for *couchdb*

Here is the internal representation of all pattern documents stored in couchdb that node.js wrangles into protopatterns or the final JSON-LD / representations that are sent. These are what is stored -

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
	"\_attachments": pic and diagram attachments
	"doctype": "pattern",
	"int_id": integer,
	"name": string,
	"pic": url,
	"author": ['_id'],
	"context": string,
	"problem": string,
	"force": ['id'],
	"solution": string,
	"rationale": string,
	"diagram": url,
	"evidence": ['_id']
}

*Contributor Doc*
{
	"\_id": orchid_string ,
	"\_rev": couch_db hash,
	"doctype": "contributor",
	"ORCID": url as string,
	"authorName": string
}

*Force Doc*

{
	"\_id":  couchdb_id,
	"\_rev": couchdb_hash,
	"doctype": "force",
	"int_id": integer,
	"forceName": string,
	"description": string,
	"pic": url as string,
	"parentPattern": "_id",

}

*Evidence doc*

{
	"\_id":  couchdb_id,
	"\_rev": couchdb_hash,
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

*ProtoPattern Doc*
{
	"\_id": couchdb_id,
	"\_rev":	couchdb_hash,
	"\_attachments": all file attachments (filenames prefixed with pic\_\_, force\__x, diagram__)
	"doctype": "protopattern",
	"int_id": integer,
	"name": string,
	"author\_x_name": string,
	"author\_x_orcid": string,
	"context": string,
	"problem": string,
	"force\_x_name": string,
	"force\_x_definition": string
	"solution": string,
	"rationale": string,
	"ref\_x_reference": string (must be valid bibTex)
}

*Exemplar Doc*
{
	"\_id": crypto-generated-uuid,
	"\_rev":	couchdb_hash,
	"doctype": "exemplar",
	"comment": string,
	"targetURL": string,
	"pageName": string,
	"creatorORCID": string,
	"concernsPattern": string,
	"targetDetail": string,
	"concernsForce": array of objects [{"@id": url, "@type": url, "exemplifiedBy": string}]
}
