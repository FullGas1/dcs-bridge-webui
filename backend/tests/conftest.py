import pytest
from fastapi.testclient import TestClient

from app import main as main_module
from app.store import Store


@pytest.fixture
def tmp_store(tmp_path, monkeypatch):
    """Points the app's module-level store at a throwaway file so tests never touch
    backend/data/store.json (which holds real, gitignored connection settings)."""
    store = Store(tmp_path / "store.json")
    monkeypatch.setattr(main_module, "store", store)
    return store


@pytest.fixture
def client(tmp_store):
    return TestClient(main_module.app)
