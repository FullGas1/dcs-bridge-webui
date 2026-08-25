# Turnkey distribution with first-run connection banner

The target user is a non-technical mission-maker who should be able to download the package,
create a desktop shortcut, and have the UI work with minimal setup — no editing YAML, no
installing Python/Node. This drives two decisions:

**Packaging**: a single executable (mirroring `CTLD-TOOLS-WEBAPP`'s pattern) that, on launch,
starts the local backend and opens the UI in the default browser.

**Connection defaults**: `dcs-serve`'s REST API (`http_port`, default `8080`) is a different
port from the TCP link used by the mission's injected `dcs-bridge.lua` (`tcp_port`, default
`7777`) — confirmed against a real `dcs-serve.yaml`. The UI ships with `127.0.0.1:8080`
pre-filled, since that's the common single-PC setup. The `api_key` cannot be shipped — it's
generated locally by `dcs-serve` on its own first launch and has no fixed format guaranteed
across dcs-bridge versions. Instead, the UI shows a first-run banner prompting the user to
paste the key (plain opaque text field, no format validation) until a connection succeeds;
once entered, it's persisted in the same local gitignored store as the script templates.
