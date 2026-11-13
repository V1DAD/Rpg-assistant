/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_976091127")

  // update field
  collection.fields.addAt(2, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_327047008",
    "help": "",
    "hidden": false,
    "id": "relation1653163849",
    "maxSelect": 1000,
    "minSelect": 0,
    "name": "tracks",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_976091127")

  // update field
  collection.fields.addAt(2, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_327047008",
    "help": "",
    "hidden": false,
    "id": "relation1653163849",
    "maxSelect": 10,
    "minSelect": 0,
    "name": "tracks",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
})
