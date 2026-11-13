routerAdd("GET", "/api/time", (e) => {
    return e.json(200, { now: Date.now() })
})