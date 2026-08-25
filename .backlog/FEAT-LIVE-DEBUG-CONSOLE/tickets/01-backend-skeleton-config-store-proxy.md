# 01 — backend skeleton, local config store, injection proxy

**Status:** open (ready-for-agent)

## What to build

A FastAPI backend skeleton exposing one endpoint that proxies a Lua snippet to `dcs-serve`'s
`POST /api/exec` (`Authorization: Bearer <api_key>`), plus a small local, gitignored key-value
store module the backend uses to hold connection settings (`host`, `port`, `api_key`). No
frontend in this slice — the proxy is verified over HTTP directly. This is the foundation ADR
0001 (local backend proxy) and ADR 0003 (FastAPI) describe, and the store this slice builds is
reused later by the templates ticket (05) and the connection-banner ticket (06).

Connection settings default to `host=127.0.0.1`, `port=8080` when the store is empty (matching
`dcs-serve`'s `http_port` default). No format validation is applied to `api_key` — it's stored
and forwarded as opaque text.

## Acceptance criteria

- [ ] `POST` an execute-style request to the backend with a Lua snippet forwards it to
      `dcs-serve`'s `/api/exec` using the store's `host`/`port`/`api_key`, and returns
      `dcs-serve`'s raw response body to the caller.
- [ ] With an empty store, the backend uses `127.0.0.1:8080` as the connection default.
- [ ] The store persists across backend restarts (written to a local, gitignored file) and is
      never committed to git.
- [ ] An `api_key` containing arbitrary characters (not just alphanumeric) round-trips through
      the store and the `Authorization` header unchanged.
- [ ] A `dcs-serve` connection failure (refused connection, non-2xx, timeout) surfaces as a
      distinguishable error from the endpoint rather than an unhandled exception.

## Blocked by

None — can start immediately.
