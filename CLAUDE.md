# dcs-bridge-webui — working conventions

## Nothing without grill-with-docs → to-prd → to-issues

Every change — feature, fix, refactor — starts with the `grill-with-docs` skill, even when the
plan feels already resolved in conversation. Then `to-prd` (publishes to `.backlog/<LOT-ID>/`),
then `to-issues` (tickets under `.backlog/<LOT-ID>/tickets/`). Do not skip straight to
implementation. See `.backlog/README.md` for the lot index and `.backlog/roadmap.md` for ideas
not yet formalized into a lot.

## Branch + PR, always

`master` is never committed to directly (this repo is now public,
`github.com/FullGas1/dcs-bridge-webui`). Every lot/ticket gets its own branch and a PR — no
exceptions, however small the change.

## Reference docs

- [`CONTEXT.md`](CONTEXT.md) — domain glossary (Widget, Injection, Result, Template, etc.). Keep
  it a glossary only — no implementation details.
- `docs/adr/` — architectural decisions, created only when a decision is hard to reverse,
  surprising without context, and the result of a real trade-off.
- [`README.md`](README.md) — user-facing: prerequisites (VEAF-dcs-bridge, `dcs-serve`), building
  and running the packaged exe, first-connection `api_key` discovery.
