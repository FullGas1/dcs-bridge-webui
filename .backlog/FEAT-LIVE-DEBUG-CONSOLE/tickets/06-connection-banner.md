# 06 — turnkey connection banner

**Status:** open (ready-for-agent)

## What to build

A banner shown whenever the backend cannot reach `dcs-serve` — connection failure, timeout, or
an auth error from a wrong `api_key` — not only on a literal first run. It offers a single
opaque text field for the `api_key` (no client-side format validation, since the value's shape
is controlled by an external tool, VEAF-dcs-bridge, and isn't guaranteed stable) and static help
text: "Open `dcs-serve.yaml` (created in the folder you launched `dcs-serve` from) and copy the
`api_key` value." Submitting the field writes it to ticket 01's local store and retries the
connection; the banner disappears once a call succeeds and stays hidden until the backend can't
reach `dcs-serve` again (e.g. `dcs-serve` restarts with a new key).

## Acceptance criteria

- [ ] On a fresh install (empty store, `dcs-serve` unreachable at the `127.0.0.1:8080` default),
      the banner appears with the static help text and an empty `api_key` field.
- [ ] Pasting an arbitrary string and submitting retries the connection; on success the banner
      disappears and the key is persisted in the ticket 01 store.
- [ ] On failure (still unreachable, or `dcs-serve` rejects the key) the banner stays visible
      with a clear indication the attempt failed, without crashing the page.
- [ ] Reloading the page after a successful connection does not show the banner again.
- [ ] If `dcs-serve` later becomes unreachable with a previously-working key (e.g. restarted with
      a new key), the banner reappears on the next failed call.

## Blocked by

- Ticket 02 (single-widget injection loop)
