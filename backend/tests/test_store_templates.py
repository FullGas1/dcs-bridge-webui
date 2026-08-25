from app.store import Store


def test_get_templates_defaults_to_empty_list(tmp_path):
    store = Store(tmp_path / "store.json")
    assert store.get_templates() == []


def test_save_template_persists_across_instances(tmp_path):
    path = tmp_path / "store.json"
    Store(path).save_template("check menu", "return checkMenu()")

    templates = Store(path).get_templates()

    assert len(templates) == 1
    assert templates[0]["name"] == "check menu"
    assert templates[0]["code"] == "return checkMenu()"
    assert templates[0]["id"]  # assigned, non-empty


def test_saving_a_second_template_keeps_both(tmp_path):
    store = Store(tmp_path / "store.json")
    store.save_template("a", "code a")
    store.save_template("b", "code b")

    names = {t["name"] for t in store.get_templates()}

    assert names == {"a", "b"}


def test_saving_a_template_with_an_existing_name_overwrites_it(tmp_path):
    store = Store(tmp_path / "store.json")
    store.save_template("check menu", "old code")

    store.save_template("check menu", "new code")
    templates = store.get_templates()

    assert len(templates) == 1
    assert templates[0]["code"] == "new code"


def test_delete_template_removes_only_the_matching_id(tmp_path):
    store = Store(tmp_path / "store.json")
    store.save_template("a", "code a")
    templates = store.save_template("b", "code b")
    id_a = next(t["id"] for t in templates if t["name"] == "a")

    remaining = store.delete_template(id_a)

    assert [t["name"] for t in remaining] == ["b"]


def test_delete_unknown_template_id_is_a_no_op(tmp_path):
    store = Store(tmp_path / "store.json")
    store.save_template("a", "code a")

    remaining = store.delete_template("does-not-exist")

    assert len(remaining) == 1
