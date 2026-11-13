/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update collection data
  unmarshal({
    "listRule": "id = @request.auth.id || @request.auth.role = \"dm\"",
    "updateRule": "id = @request.auth.id || @request.auth.role = \"dm\"",
    "viewRule": "id = @request.auth.id || @request.auth.role = \"dm\""
  }, collection)

  // update field
  collection.fields.addAt(8, new Field({
    "help": "",
    "hidden": false,
    "id": "select1466534506",
    "maxSelect": 0,
    "name": "role",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "Player",
      "dm"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update collection data
  unmarshal({
    "listRule": "id = @request.auth.id || @request.auth.role = \"DM\"",
    "updateRule": "id = @request.auth.id || @request.auth.role = \"DM\"",
    "viewRule": "id = @request.auth.id || @request.auth.role = \"DM\""
  }, collection)

  // update field
  collection.fields.addAt(8, new Field({
    "help": "",
    "hidden": false,
    "id": "select1466534506",
    "maxSelect": 0,
    "name": "role",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "DM",
      "Player"
    ]
  }))

  return app.save(collection)
})
