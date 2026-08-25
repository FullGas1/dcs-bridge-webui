from app.static import resolve_frontend_dist


def test_returns_none_when_nothing_is_built(tmp_path):
    assert resolve_frontend_dist(None, tmp_path) is None


def test_finds_frontend_dist_relative_to_repo_root_in_dev_mode(tmp_path):
    (tmp_path / "frontend" / "dist").mkdir(parents=True)

    assert resolve_frontend_dist(None, tmp_path) == tmp_path / "frontend" / "dist"


def test_finds_bundled_frontend_dist_when_frozen(tmp_path):
    (tmp_path / "frontend_dist").mkdir()

    assert resolve_frontend_dist(str(tmp_path), tmp_path) == tmp_path / "frontend_dist"


def test_prefers_meipass_over_the_repo_relative_path_when_frozen(tmp_path):
    meipass = tmp_path / "meipass"
    (meipass / "frontend_dist").mkdir(parents=True)
    (tmp_path / "frontend" / "dist").mkdir(parents=True)  # would also exist - must be ignored

    assert resolve_frontend_dist(str(meipass), tmp_path) == meipass / "frontend_dist"
