# Watson Discovery insert node.

This is a set of nodes for working with the [IBM Watson Discovery service.](https://www.ibm.com/watson/services/discovery/) IBM Watson™ Discovery makes it possible to rapidly build cognitive, cloud-based exploration applications that unlock actionable insights hidden in unstructured data — including your own proprietary data, as well as public and third-party data.

This package offers two nodes

Insert - For publishing documents to watson discovery.
Update - For updaging documents already in the service

The nodes both contain quing systems, and will auto retry if discovery responds with a 429 ( busy ). In the node you can define that maxiumum number of items to queue up, and how long in milliseconds to wait between retrys.


## Example Useage
### Insert JSON data, via a function node connected to insert node:

```javascript
msg.datatype = "JSON"
msg.payload = {
              sampledata:"some data goes here"
              };
return msg;
```

### Update Binary file (e.g pdf/word) , via a function node connected to an update node:

```javascript
msg.datatype = "BIN"
msg.payload = {
              content = msg.payload.content //This should be a Buffer from an fs.readFileSync(),
              fileName = "updated_doc_v2.pdf"
              }
msg.document_id = "6022b729-f180-4772-88a7-f73333594ead"

return msg;
```

### Setting the Collection or Eniviroment ID dynamicly:

```javascript
msg.datatype = "JSON"
msg.payload = {
              sampledata:"some data goes here"
              };
msg.environment_id = "env_id";
msg.collection_id = "collection_id"
return msg;
```