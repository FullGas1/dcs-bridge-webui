from app.store import CONNECTION_DEFAULTS, Store


def test_get_connection_defaults_when_empty(tmp_path):
    store = Store(tmp_path / "store.json")
    assert store.get_connection() == CONNECTION_DEFAULTS


def test_set_connection_persists_across_instances(tmp_path):
    path = tmp_path / "store.json"
    Store(path).set_connection(api_key="secret123")

    reloaded = Store(path).get_connection()

    assert reloaded["api_key"] == "secret123"
    assert reloaded["host"] == CONNECTION_DEFAULTS["host"]


def test_set_connection_creates_missing_parent_directories(tmp_path):
    path = tmp_path / "nested" / "store.json"
    Store(path).set_connection(host="10.0.0.5")
    assert path.exists()


def test_arbitrary_api_key_round_trips_unchanged(tmp_path):
    weird_key = "áb!@#$%^&*()_+-={}[]|:;\"'<>,.?/~`\\ключ"
    store = Store(tmp_path / "store.json")

    store.set_connection(api_key=weird_key)

    assert store.get_connection()["api_key"] == weird_key


def test_store_file_is_never_written_outside_its_own_path(tmp_path):
    path = tmp_path / "store.json"
    Store(path).set_connection(port=9090)
    assert list(tmp_path.iterdir()) == [path]
