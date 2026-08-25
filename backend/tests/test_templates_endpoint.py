def test_list_templates_empty_by_default(client):
    resp = client.get("/api/templates")
    assert resp.status_code == 200
    assert resp.json() == []


def test_save_and_list_template(client):
    save_resp = client.post("/api/templates", json={"name": "check menu", "code": "return 1"})
    assert save_resp.status_code == 200
    assert [t["name"] for t in save_resp.json()] == ["check menu"]

    list_resp = client.get("/api/templates")
    assert [t["name"] for t in list_resp.json()] == ["check menu"]


def test_save_template_rejects_a_blank_name(client):
    resp = client.post("/api/templates", json={"name": "   ", "code": "return 1"})
    assert resp.status_code == 400


def test_saving_a_template_with_an_existing_name_overwrites_it(client):
    client.post("/api/templates", json={"name": "check menu", "code": "old"})
    resp = client.post("/api/templates", json={"name": "check menu", "code": "new"})

    templates = resp.json()

    assert len(templates) == 1
    assert templates[0]["code"] == "new"


def test_delete_template_removes_it(client):
    save_resp = client.post("/api/templates", json={"name": "check menu", "code": "return 1"})
    template_id = save_resp.json()[0]["id"]

    delete_resp = client.delete(f"/api/templates/{template_id}")

    assert delete_resp.status_code == 200
    assert delete_resp.json() == []
    assert client.get("/api/templates").json() == []


def test_templates_are_shared_state_not_per_request(client):
    client.post("/api/templates", json={"name": "a", "code": "1"})
    client.post("/api/templates", json={"name": "b", "code": "2"})

    names = {t["name"] for t in client.get("/api/templates").json()}

    assert names == {"a", "b"}
