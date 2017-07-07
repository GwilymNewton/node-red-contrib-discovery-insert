module.exports = function (RED) {
  function DiscoveryInsert(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    var DiscoveryV1 = require('watson-developer-cloud/discovery/v1');
    var stream = require('stream');

    var discovery = new DiscoveryV1({
      username: this.credentials.username,
      password: this.credentials.password,
      version_date: '2017-06-25'
    });

    var environment = config.environment;
    var collection = config.collection;


    node.on('input', function (msg) {

      var document_obj = {
        environment_id: environment,
        collection_id: collection,
        file: msg.payload
      };

      console.log(document_obj);

      discovery.addJsonDocument(document_obj, function (err, response) {
        if (err) {
          node.error(""+err, msg);
        } else {
          msg.payload = response;
          node.send(msg);
        }
      });



    });
  }



  RED.nodes.registerType("discovery-insert", DiscoveryInsert, {
    credentials: {
      username: {
        type: "text"
      },
      password: {
        type: "password"
      }
    }
  });
}
