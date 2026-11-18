package migrations

import (
	"database/sql"
	"errors"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		// if the collection already exists, leave it alone
		if _, err := app.FindCollectionByNameOrId("sfx"); err == nil {
			return nil
		} else if !errors.Is(err, sql.ErrNoRows) {
			return err
		}

		tracks, err := app.FindCollectionByNameOrId("tracks")
		if err != nil {
			return err
		}

		signedIn := `@request.auth.id != ""`
		onlyDM := `@request.auth.role = "dm"`

		collection := core.NewBaseCollection("sfx")
		collection.ListRule = &signedIn
		collection.ViewRule = &signedIn
		collection.CreateRule = &onlyDM
		collection.UpdateRule = &onlyDM
		collection.DeleteRule = &onlyDM

		collection.Fields.Add(
			&core.RelationField{Name: "track", CollectionId: tracks.Id, MaxSelect: 1},
			&core.NumberField{Name: "seq"},
		)

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("sfx")
		if err != nil {
			return nil
		}
		return app.Delete(collection)
	})
}
