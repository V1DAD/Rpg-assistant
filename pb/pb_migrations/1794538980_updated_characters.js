/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3298390430")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.role = \"dm\"",
    "deleteRule": "@request.auth.role = \"dm\"",
    "listRule": "@request.auth.role = \"dm\" || owner = @request.auth.id",
    "updateRule": "@request.auth.role = \"dm\" ||\n(\n  owner = @request.auth.id &&\n  @request.body.base_stats:isset = false &&\n  @request.body.owner:isset = false &&\n  @request.body.name:isset = false &&\n  @request.body.class:isset = false &&\n  @request.body.description:isset = false &&\n  @request.body.icon:isset = false\n)",
    "viewRule": "@request.auth.role = \"dm\" || owner = @request.auth.id"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3298390430")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.role = \"DM\"",
    "deleteRule": "@request.auth.role = \"DM\"",
    "listRule": "@request.auth.role = \"DM\" || owner = @request.auth.id",
    "updateRule": "@request.auth.role = \"DM\" ||\n(\n  owner = @request.auth.id &&\n  @request.body.base_stats:isset = false &&\n  @request.body.owner:isset = false &&\n  @request.body.name:isset = false &&\n  @request.body.class:isset = false &&\n  @request.body.description:isset = false &&\n  @request.body.icon:isset = false\n)",
    "viewRule": "@request.auth.role = \"DM\" || owner = @request.auth.id"
  }, collection)

  return app.save(collection)
})
