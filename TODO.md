##TODO

####Task/reseach topic																DONE?
how to template POSTs for JSON(-LD)

fill out design sheet
	- write state diagram
	- design representations 
	- map to couch docs
	- node.js glue

bibJSON
	- .tolowercase() when reading in bibTEX to JSON (for the JSON KEYS)
	- will also need to deal with citekey to make it a node.

refactor "evidence" or create new field to allow URLs+descripions for 
non-bibTEX resources (eg videos, blogs, stackexchange answers)...

rewrite pattern ontology - 2 classes - Pattern, Force - properties 

add to context docs, @type and @id for property values that sould be 
dereferencable

publish pattern ontology - set up server with content negotiation,
- ttl, rdf/XML, 303 HTML

add DesignPattern, Force, Reference, Contributor to @contex docs