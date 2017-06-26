module.exports = function(RED) {
    function DiscoveryInsert(config) {
        RED.nodes.createNode(this,config);
        var node = this;

        var DiscoveryV1 = require('watson-developer-cloud/discovery/v1');

          var discovery = new DiscoveryV1({
            username: '{username}',
            password: '{password}',
            version_date: '2017-06-25'
          });




        node.on('input', function(msg) {
            msg.payload = msg.payload.toLowerCase();
            node.send(msg);
        });
    }



    RED.nodes.registerType("discovery-insert",DiscoveryInsert,{
     credentials: {
         username: {type:"text"},
         password: {type:"password"}
     }
 });
}
