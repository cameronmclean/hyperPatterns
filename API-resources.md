
Resources									HTTP

/patterns									GET - returns list of all patterns {Name, Pictogram, Problem, Authors, GET URL}
/patterns/new								GET - returns form/json template? (API specific resource for HTML client) - POST to /patterns
/patterns									POST - JSON encoded strucutre 
/patterns/:patternName						GET - returns composite resource representatio of entire pattern and child resources
/patterns/authors 							GET - returns {Author name, ORCID, list of pattern name, URI}
*/patterns/authors/new						GET - template for POST*
/patterns/:patternName/authors				GET - returns list of all pattern authors
/patterns/:patternName/authors				POST - accepts JSON encoded new author (author must not already exist)
/patterns/:patternName/authors/:authorID	PUT - accepts JSON encoded author edit (author must already exist)
/patterns/:patternName/authors/:authorID	DELETE - and its gone
/patterns/:patternName/forces				GET - returns list of all pattern forces
/patterns/:patternName/forces				POST - accepts JSON encoded new force (force must not already exist)
*/patterns/:patternName/forces/new			GET - template for POSt*
/patterns/:patternName/forces/:forceName   	GET - JSON-LD force
/patterns/:patternName/forces/:forceName   	PUT - accepts JSON encoded edited force (force must exist)
/patterns/:patternName/forces/:forceName   	DELETE - and its gone  
/patterns/:patternName/evidence				GET - list of JSON-LD encoded bibTEX references
/patterns/:patternName/evidence				POST - bibTEXT reference (media type?)
/patterns/:patternName/evidence/:refID		GET - JSON-LD encoded bibtex ref
/patterns/:patternName/evidence/:refID		PUT - edited bibTEX reference (media type?)
/patterns/:patternName/evidence/:refID		DELETE - and it's gone