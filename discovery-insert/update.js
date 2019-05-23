var crypto = require('crypto');
var stream = require('stream');

module.exports = function (RED) {
    function DiscoveryUpdate(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        var DiscoveryV1 = require('ibm-watson/discovery/v1');

        var options = {
            version: '2019-03-25',
        };

        if (config.endpoint) {
            options.endpoint = config.endpoint;
        }

        if (this.credentials.apikey) {
            options.iam_apikey = this.credentials.apikey;
        } else {
            options.username = this.credentials.username;
            options.password = this.credentials.password;
        }

        var discovery = new DiscoveryV1(options);
        var environment = config.environment;
        var collection = config.collection;

        var update_queue = [];

        //allow for overide of delay
        var delay = (config.delay !== 0) ? parseInt(config.delay) : 1000;
        var max_Q_size = (config.max_Q_size !== 0) ? parseInt(config.max_Q_size) : 10000;

        //update Q size once per second.
        var status_update_period = 750;

        //start Q
        setInterval(processQueue, delay);
        setInterval(updateStatus, status_update_period);


        //START OFF FUNCTIONS
        function getSHA1(input) {
            return crypto.createHash('sha1').update(JSON.stringify(input)).digest('hex');
        }

        function updateInDiscoveryJSON(msg) {
            return new Promise(function (resolve, reject) {

                var env = (msg.hasOwnProperty('environment_id')) ? msg.environment_id : environment;
                var col = (msg.hasOwnProperty('collection_id')) ? msg.collection_id : collection;
                var doc = (msg.hasOwnProperty('document_id')) ? msg.document_id : null;

                const string = JSON.stringify(msg.payload.content);
                const file = Buffer.from(string, 'utf8');
                const sha1 = getSHA1(string);
                const filename = msg.payload.filename || `${sha1}.json`;

                var document_obj = {
                    environment_id: env,
                    collection_id: col,
                    document_id: doc,
                    file: file,
                    filename: filename,
                    file_content_type: 'application/json',
                };

                discovery.addDocument(document_obj, function (err, response) {
                    if (err) {
                        if (err.code === 429) {
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

        function updateInDiscoveryBIN(msg) {
            return new Promise(function (resolve, reject) {

                var env = (msg.hasOwnProperty('environment_id')) ? msg.environment_id : environment;
                var col = (msg.hasOwnProperty('collection_id')) ? msg.collection_id : collection;
                var doc = (msg.hasOwnProperty('document_id')) ? msg.document_id : null;

                var document_obj = {
                    environment_id: env,
                    collection_id: col,
                    document_id: doc,
                    file: msg.payload.content,
                    filename: msg.payload.filename,
                    file_content_type: msg.payload.file_content_type || undefined,
                };

                discovery.updateDocument(document_obj, function (err, response) {
                    if (err) {

                        if (err.code === 429) {
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
            if (update_queue.length !== 0) {

                var msg = update_queue.pop();

                updateDiscovery(msg);
            }
        }

        function updateStatus() {
            var size = update_queue.length;
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


        function updateDiscovery(msg) {
            var update = updateInDiscoveryJSON;

            if (msg.payload.content instanceof Buffer || msg.payload.content instanceof stream.Readable || msg.payload.content instanceof FileObject) {
                update = updateInDiscoveryBIN;
            }

            update(msg).then(function (response) {
                if (response !== 429) {
                    msg.payload = response;
                    msg.q_size = update_queue.length;
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
            if (update_queue.length < max_Q_size) {
                update_queue.push(msg);
            } else {
                node.error("Queue Full, dropping Message");
            }
        }

        node.on('input', function (msg) {
            updateDiscovery(msg);
        });
    }


    RED.nodes.registerType("discovery-update", DiscoveryUpdate, {
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
