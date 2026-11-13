/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3200938011")

  // update field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_327047008",
    "help": "",
    "hidden": false,
    "id": "relation3605264550",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "track",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3200938011")

  // update field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_327047008",
    "help": "",
    "hidden": false,
    "id": "relation3605264550",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "track",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
})
