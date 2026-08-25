from pathlib import Path

from app.store import resolve_store_path


def test_dev_mode_uses_backend_data_relative_to_source_file():
    source_file = Path("C:/repo/backend/app/store.py")

    path = resolve_store_path(False, Path("C:/whatever/python.exe"), source_file)

    assert path == Path("C:/repo/backend/data/store.json")


def test_frozen_mode_uses_a_directory_next_to_the_exe_not_the_extraction_dir():
    executable = Path("C:/Users/pilot/Desktop/dcs-bridge-webui.exe")
    # This is what a PyInstaller --onefile build's __file__ looks like at runtime - ephemeral,
    # deleted on exit. The store must NOT end up under here.
    meipass_source_file = Path("C:/Users/pilot/AppData/Local/Temp/_MEI12345/app/store.py")

    path = resolve_store_path(True, executable, meipass_source_file)

    assert path == Path("C:/Users/pilot/Desktop/data/store.json")
