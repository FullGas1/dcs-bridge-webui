"""PyInstaller entry point (ticket 08): boots the backend and opens the UI in the browser.

The console window this runs in IS the server's lifecycle window - closing it stops the
server. No --noconsole, no background service, no separate detach step.
"""
import threading
import webbrowser

import uvicorn

from app.main import app

HOST = "127.0.0.1"
PORT = 8000


def main() -> None:
    url = f"http://{HOST}:{PORT}"
    threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    print(f"dcs-bridge-webui starting at {url} - close this window to stop it.")
    uvicorn.run(app, host=HOST, port=PORT)


if __name__ == "__main__":
    main()
