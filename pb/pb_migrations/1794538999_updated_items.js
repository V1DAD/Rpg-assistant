/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_710432678")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.role = \"dm\"",
    "deleteRule": "@request.auth.role = \"dm\"",
    "listRule": "@request.auth.role = \"dm\" || owner = @request.auth.id",
    "updateRule": "@request.auth.role = \"dm\"",
    "viewRule": "@request.auth.role = \"dm\" || owner = @request.auth.id"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_710432678")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.role = \"DM\"",
    "deleteRule": "@request.auth.role = \"DM\"",
    "listRule": "@request.auth.role = \"DM\" || owner = @request.auth.id",
    "updateRule": "@request.auth.role = \"DM\"",
    "viewRule": "@request.auth.role = \"DM\" || owner = @request.auth.id"
  }, collection)

  return app.save(collection)
})
