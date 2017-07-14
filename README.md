# Watson Discovery insert node.


  - Inserts documents into IBM watson Discovery
  - auto retrys inserts if 429 ( busy ) responce comes back
  - You can use msg.environment_id and msg.collection_id to dynamicly overide 