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

    var document_queue = [];

    //allow for overide of delay
    var delay = (config.delay !== 0) ? parseInt(config.delay) : 1000;

    //update Q size once per second.
    var status_update_period = 500;

    //start Q
    setInterval(processQueue, delay);
    setInterval(updateStatus, status_update_period);

    function sendToDiscovery(msg) {
      return new Promise(function (resolve, reject) {

        var env = (msg.hasOwnProperty('environment_id')) ? msg.environment_id : environment;
        var col = (msg.hasOwnProperty('collection_id')) ? msg.collection_id : collection;


        var document_obj = {
          environment_id: env,
          collection_id: col,
          file: msg.payload
        };


        discovery.addJsonDocument(document_obj, function (err, response) {
          if (err) {

            if (err.code == 429) {
              resolve(429);

            } else {
              reject(err);
            }
          } else {
            resolve(response);

          }
        });
      });
    }

    function processQueue() {
      if (document_queue.length !== 0) {

        var msg = document_queue.pop();

        addToDiscovery(msg);
      }
    }

    function updateStatus() {
      var size = document_queue.length;
      if (size !== 0) {
        node.status({
          fill: "red",
          shape: "dot",
          text: "Queue Size: " + size
        });
      } else {
        node.status({
          fill: "green",
          shape: "dot",
          text: "Queue empty"
        });
      }
    }

    node.on('input', function (msg) {
      addToDiscovery(msg);
    });


    function addToDiscovery(msg) {
      sendToDiscovery(msg).then(function (response) {

        if (response !== 429) {
          msg.payload = response;
          msg.q_size = document_queue.length;
          node.send(msg);
        } else if (response === 429) {
          addToQueue(msg);
        }


      }).catch(function (err) {
        if (("" + err).includes("ECONNREFUSED")) {
          addToQueue(msg);
        } else {
          node.error("" + err);
        }

      });
    }

    function addToQueue(msg) {
      document_queue.push(msg);
    }

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
