(cd server && go run . serve --http=0.0.0.0:8090) &
(cd web && npm run dev) &
