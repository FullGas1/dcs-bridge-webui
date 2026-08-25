def test_api_responses_carry_no_cache(client):
    resp = client.get("/api/connection")
    assert resp.headers["cache-control"] == "no-cache"


def test_post_responses_carry_no_cache_too(client, monkeypatch):
    resp = client.put("/api/connection", json={"api_key": "x"})
    assert resp.headers["cache-control"] == "no-cache"
