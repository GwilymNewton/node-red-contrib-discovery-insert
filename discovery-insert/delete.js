var crypto = require('crypto');
var stream = require('stream');
var { IamAuthenticator, BasicAuthenticator } = require('ibm-watson/auth');
var DiscoveryV1 = require('ibm-watson/discovery/v1');

module.exports = function (RED) {
    function DiscoveryDelete(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        var options = {
            version: '2019-04-30',
            headers: {
                'X-Watson-Learning-Opt-Out': 'true'
            }
        };

        if (config.endpoint) {
            options.url = config.endpoint;
        }

        if (this.credentials.apikey) {
            options.authenticator = new IamAuthenticator({apikey: this.credentials.apikey});
        } else {
            options.authenticator = new BasicAuthenticator({username: this.credentials.username, password: this.credentials.password});
        }

        var discovery = new DiscoveryV1(options);
        var environment = config.environment;
        var collection = config.collection;

        var delete_queue = [];

        //allow for override of delay
        var delay = (config.delay !== 0) ? parseInt(config.delay) : 1000;
        var max_Q_size = (config.max_Q_size !== 0) ? parseInt(config.max_Q_size) : 10000;

        //update Q size once per second.
        var status_update_period = 750;

        //start Q
        setInterval(processQueue, delay);
        setInterval(updateStatus, status_update_period);


        //START OFF FUNCTIONS
        function deleteDocumentDiscovery(msg) {
            return new Promise(function (resolve, reject) {

                var env = (msg.hasOwnProperty('environment_id')) ? msg.environment_id : environment;
                var col = (msg.hasOwnProperty('collection_id')) ? msg.collection_id : collection;
                var doc = (msg.hasOwnProperty('document_id')) ? msg.document_id : null;

                var document_obj = {
                    environmentId: env,
                    collectionId: col,
                    documentId: doc,
                };

                discovery.deleteDocument(document_obj).then((response) => {
                    resolve(response);
                }).catch((err) => {
                    if (err.code === 429) {
                        resolve(429);
                    } else {
                        reject(err);
                    }
                });
            });
        }

        function processQueue() {
            if (delete_queue.length !== 0) {
                var msg = delete_queue.pop();
                deleteDiscovery(msg);
            }
        }

        function updateStatus() {
            var size = delete_queue.length;
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


        function deleteDiscovery(msg) {
            deleteDocumentDiscovery(msg).then(function (response) {
                if (response !== 429) {
                    msg.payload = response;
                    msg.q_size = delete_queue.length;
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
            if (delete_queue.length < max_Q_size) {
                delete_queue.push(msg);
            } else {
                node.error("Queue Full, dropping Message");
            }
        }

        node.on('input', function (msg) {
            deleteDiscovery(msg);
        });
    }


    RED.nodes.registerType("discovery-delete", DiscoveryDelete, {
        credentials: {
            username: {
                type: "text"
            },
            password: {
                type: "password"
            },
            apikey: {
                type: "password"
            }
        }
    });
};
