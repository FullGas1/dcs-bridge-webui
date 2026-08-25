# Local backend proxy between the UI and dcs-serve

The browser UI needs to send Lua injections to `dcs-serve`'s REST API (`POST /api/exec`),
which is protected by an `api_key`. Calling `dcs-serve` directly from the browser would leak
the key into client-side JS and depends on `dcs-serve` allowing CORS from the UI's origin,
which is outside this project's control. Instead, a small local backend (mirroring the
`CTLD-TOOLS-WEBAPP` pattern: single-user, no DB, no auth) holds the `api_key` and proxies
requests to `dcs-serve`. The backend is also the natural place to persist script templates.
